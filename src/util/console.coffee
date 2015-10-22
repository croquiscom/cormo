##
# CORMO console
# @module console
# @namespace cormo

coffee = require 'coffee-script'
fs = require 'fs'
path = require 'path'
Promise = require 'bluebird'
repl_coffee = require 'coffee-script/repl'
repl_js = require 'repl'
vm = require 'vm'
util = require 'util'

Connection = require '../connection'
Model = require '../model'

setupContext = (context, options) ->
  context.Connection = Connection
  context.Model = Model
  context.connection = connection = Connection.defaultConnection
  if connection
    for model, modelClass of connection.models
      context[model] = modelClass
    connection.applySchemas()
  Object.defineProperty context.console, 'inspect_depth',
    configurable: true
    enumrable: true
    get: => return options.inspect_depth
    set: (value) => options.inspect_depth = value
  for key, object of exports.public
    context[key] = object
  context.getTimestamp = (object_id) ->
    new Date parseInt(object_id.substr(0, 8), 16) * 1000
  context.console.measureTime = (fn) ->
    context.console.time 'measureTime'
    Promise.resolve fn()
    .tap ->
      context.console.timeEnd 'measureTime'
  return

##
# Members of this object will be imported when a console is started
# @memberOf console
exports.public = {}

addArgCompleterCoffee = (repl_server) ->
  rli = repl_server.rli
  node_completer = rli.completer
  rli.completer = (line, callback) ->
    node_completer line, (error, result) ->
      show_args = true
      if error or not result[0]
        # something wrong
        show_args = false
      else if result[0].length > 1
        # more than one candidate
        show_args = false
      else if result[0].length is 1 and result[0][0] isnt result[1]
        # one candidate but need to be completed automatically
        show_args = false
      else if not /^[A-Za-z0-9_.]+\s*$/.test line
        # support only for simple case
        show_args = false
      return callback error, result if not show_args

      repl_server.eval line, repl_server.context, 'repl', (error, obj) ->
        if typeof obj is 'function'
          rli.output.write '\r\n'
          argsMatch = obj.toString().match /^function\s*[^\(]*\(\s*([^\)]*)\)/m
          rli.output.write "#{line.trim()} \u001b[35m#{argsMatch[1]}\u001b[39m\r\n"
          rli._refreshLine()
        callback error, result

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

evalCoffee = (cmd, context, filename, callback) ->
  cmd = cmd.replace /\uFF00/g, '\n'
  cmd = cmd.replace /^\(([\s\S]*)\n\)$/m, '$1'
  return callback null if not cmd

  if /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s=/.test cmd
    assign_to = RegExp.$1

  @.rli.pause()

  Promise.try ->
    if /[, ]\$$/.test cmd
      # apply defer if command is ended with '$'
      defer = Promise.defer()
      context.$ = defer.callback
    js = coffee.compile cmd, filename: filename, bare: true
    result = vm.runInContext js, context, filename
    if defer
      delete context.$
      return defer.promise
    else
      return result
  .then (result) =>
    if assign_to
      context[assign_to] = result
    @.rli.resume()
    callback null, result
  .catch (error) =>
    @.rli.resume()
    callback prettyErrorMessage error, filename, cmd, true

##
# Starts a CoffeeScript console
# @memberOf console
# @param {Object} options
exports.startCoffee = (options) ->
  options.inspect_depth or= 2
  if options.socket
    # Can't get the exact value?
    options.socket.columns = 100
  repl_server = repl_coffee.start
    input: options.socket or process.stdin
    output: options.socket or process.stdout
    prompt: 'cormo> '
    historyFile: path.join process.env.HOME, '.cormo_history' if process.env.HOME
    eval: evalCoffee
    writer: (object) ->
      util.inspect object, colors: true, depth: options.inspect_depth
    terminal: true
  addArgCompleterCoffee repl_server
  setupContext repl_server.context, options
  return repl_server

# copied from coffee-script's repl.coffee
addHistoryJS = (repl, filename, maxSize) ->
  lastLine = null
  try
    # Get file info and at most maxSize of command history
    stat = fs.statSync filename
    size = Math.min maxSize, stat.size
    # Read last `size` bytes from the file
    readFd = fs.openSync filename, 'r'
    buffer = new Buffer(size)
    fs.readSync readFd, buffer, 0, size, stat.size - size
    fs.close readFd
    # Set the history on the interpreter
    repl.rli.history = buffer.toString().split('\n').reverse()
    # If the history file was truncated we should pop off a potential partial line
    repl.rli.history.pop() if stat.size > maxSize
    # Shift off the final blank newline
    repl.rli.history.shift() if repl.rli.history[0] is ''
    repl.rli.historyIndex = -1
    lastLine = repl.rli.history[0]

  fd = fs.openSync filename, 'a'

  repl.rli.addListener 'line', (code) ->
    if code and code.length and code isnt '.history' and lastLine isnt code
      # Save the latest command in the file
      fs.write fd, "#{code}\n"
      lastLine = code

  repl.on 'exit', -> fs.close fd

  # Add a command to show the history stack
  repl.commands[getCommandId(repl, 'history')] =
    help: 'Show command history'
    action: ->
      repl.outputStream.write "#{repl.rli.history[..].reverse().join '\n'}\n"
      repl.displayPrompt()

getCommandId = (repl, commandName) ->
  # Node 0.11 changed API, a command such as '.help' is now stored as 'help'
  commandsHaveLeadingDot = repl.commands['.help']?
  if commandsHaveLeadingDot then ".#{commandName}" else commandName

evalJS = (originalEval) ->
  (cmd, context, filename, callback) ->
    if /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s=/.test cmd
      assign_to = RegExp.$1
    @.rli.pause()
    originalEval cmd, context, filename, (error, result) =>
      if error
        @.rli.resume()
        return callback error
      Promise.resolve result
      .then (result) =>
        if assign_to
          context[assign_to] = result
        @.rli.resume()
        callback null, result
      .catch (error) =>
        @.rli.resume()
        callback error

addArgCompleterJS = (repl_server) ->
  rli = repl_server.rli
  node_completer = rli.completer
  rli.completer = (line, callback) ->
    line = line.replace /\(\s*$/, ''
    node_completer line, (error, result) ->
      show_args = true
      if error or not result[0]
        # something wrong
        show_args = false
      else if result[0].length > 1
        # more than one candidate
        show_args = false
      else if result[0].length is 1 and result[0][0] isnt result[1]
        # one candidate but need to be completed automatically
        show_args = false
      else if not /^[A-Za-z0-9_.]+\s*$/.test line
        # support only for simple case
        show_args = false
      return callback error, result if not show_args

      repl_server.eval line, repl_server.context, 'repl', (error, obj) ->
        if typeof obj is 'function'
          rli.output.write '\r\n'
          argsMatch = obj.toString().match /^function\s*[^\(]*\(\s*([^\)]*)\)/m
          rli.output.write "#{line.trim()} \u001b[35m#{argsMatch[1]}\u001b[39m\r\n"
          rli._refreshLine()
        callback error, result

##
# Starts a JavaScript console
# @memberOf console
# @param {Object} options
exports.startJS = (options) ->
  options.inspect_depth or= 2
  if options.socket
    # Can't get the exact value?
    options.socket.columns = 100
  repl_server = repl_js.start
    input: options.socket or process.stdin
    output: options.socket or process.stdout
    prompt: 'cormo> '
    writer: (object) ->
      util.inspect object, colors: true, depth: options.inspect_depth
    terminal: true
  repl_server.eval = evalJS repl_server.eval
  historyFile = path.join process.env.HOME, '.cormo_history_js' if process.env.HOME
  historyMaxInputSize = 10240
  addHistoryJS repl_server, historyFile, historyMaxInputSize if historyFile
  addArgCompleterJS repl_server
  setupContext repl_server.context, options
  return repl_server
