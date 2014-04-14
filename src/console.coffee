##
# CORMO console
# @module console
# @namespace cormo

coffee = require 'coffee-script'
fs = require 'fs'
path = require 'path'
Promise = require 'bluebird'
repl = require 'repl'
vm = require 'vm'
util = require 'util'

Connection = require './connection'
Model = require './model'
Query = require './query'

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

# from CoffeeScript repl.coffee
addMultilineHandler = (repl_server) ->
  {rli, inputStream, outputStream} = repl_server

  multiline =
    enabled: off
    initialPrompt: repl_server.prompt.replace /^[^> ]*/, (x) -> x.replace /./g, '-'
    prompt: repl_server.prompt.replace /^[^> ]*>?/, (x) -> x.replace /./g, '.'
    buffer: ''

  # Proxy node's line listener
  nodeLineListener = rli.listeners('line')[0]
  rli.removeListener 'line', nodeLineListener
  rli.on 'line', (cmd) ->
    if multiline.enabled
      multiline.buffer += "#{cmd}\n"
      rli.setPrompt multiline.prompt
      rli.prompt true
    else
      nodeLineListener cmd
    return

  # Handle Ctrl-v
  inputStream.on 'keypress', (char, key) ->
    return unless key and key.ctrl and not key.meta and not key.shift and key.name is 'v'
    if multiline.enabled
      # allow arbitrarily switching between modes any time before multiple lines are entered
      unless multiline.buffer.match /\n/
        multiline.enabled = not multiline.enabled
        rli.setPrompt repl_server.prompt
        rli.prompt true
        return
      # no-op unless the current line is empty
      return if rli.line? and not rli.line.match /^\s*$/
      # eval, print, loop
      multiline.enabled = not multiline.enabled
      rli.line = ''
      rli.cursor = 0
      rli.output.cursorTo 0
      rli.output.clearLine 1
      # XXX: multiline hack
      multiline.buffer = multiline.buffer.replace /\n/g, '\uFF00'
      rli.emit 'line', multiline.buffer
      multiline.buffer = ''
    else
      multiline.enabled = not multiline.enabled
      rli.setPrompt multiline.initialPrompt
      rli.prompt true
    return

# Store and load command history from a file
addHistory = (repl_server, filename, maxSize) ->
  lastLine = null
  try
    # Get file info and at most maxSize of command history
    stat = fs.statSync filename
    size = Math.min maxSize, stat.size
    # Read last `size` bytes from the file
    readFd = fs.openSync filename, 'r'
    buffer = new Buffer(size)
    fs.readSync readFd, buffer, 0, size, stat.size - size
    # Set the history on the interpreter
    repl_server.rli.history = buffer.toString().split('\n').reverse()
    # If the history file was truncated we should pop off a potential partial line
    repl_server.rli.history.pop() if stat.size > maxSize
    # Shift off the final blank newline
    repl_server.rli.history.shift() if repl_server.rli.history[0] is ''
    repl_server.rli.historyIndex = -1
    lastLine = repl_server.rli.history[0]

  fd = fs.openSync filename, 'a'

  repl_server.rli.addListener 'line', (code) ->
    if code and code.length and code isnt '.history' and lastLine isnt code
      # Save the latest command in the file
      fs.write fd, "#{code}\n"
      lastLine = code

  repl_server.rli.on 'exit', -> fs.close fd

  # Add a command to show the history stack
  repl_server.commands['.history'] =
    help: 'Show command history'
    action: ->
      repl_server.outputStream.write "#{repl_server.rli.history[..].reverse().join '\n'}\n"
      repl_server.displayPrompt()

addArgCompleter = (repl_server) ->
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

evalCoffee = (cmd, context, filename, callback) ->
  cmd = cmd.replace /\uFF00/g, '\n'
  cmd = cmd.replace /^\(([\s\S]*)\n\)$/m, '$1'
  return callback null if not cmd

  if /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s=/.test cmd
    assign_to = RegExp.$1

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
    else if result instanceof Query
      return result.exec()
    else
      return result
  .then (result) ->
    if assign_to
      context[assign_to] = result
    callback null, result
  .catch (error) ->
    callback prettyErrorMessage error, filename, cmd, true

setupContext = (context, options) ->
  context.Connection = Connection
  context.Model = Model
  context.connection = connection = Connection.defaultConnection
  if connection
    for model, modelClass of connection.models
      context[model] = modelClass
    connection.applySchemas()
  Object.defineProperty context.console, 'inspect_depth',
    enumrable: true,
    get: => return options.inspect_depth
    set: (value) => options.inspect_depth = value
  for key, object of exports.public
    context[key] = object

##
# Members of this object will be imported when a console is started
# @memberOf console
exports.public = {}

##
# Starts a CoffeeScript console
# @memberOf console
# @params {Object} options
exports.startCoffee = (options) ->
  options.inspect_depth or= 2
  repl_server = repl.start
    input: options.socket or process.stdin
    output: options.socket or process.stdout
    prompt: 'cormo> '
    eval: evalCoffee
    writer: (object) ->
      util.inspect object, colors: true, depth: options.inspect_depth
  addMultilineHandler repl_server
  historyFile = path.join process.env.HOME, '.cormo_history' if process.env.HOME
  addHistory repl_server, historyFile, 10240 if historyFile
  addArgCompleter repl_server
  setupContext repl_server.context, options
  return repl_server
