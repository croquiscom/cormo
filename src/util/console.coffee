##
# CORMO console
# @module console
# @namespace cormo

coffee = require 'coffee-script'
fs = require 'fs'
path = require 'path'
Promise = require 'bluebird'
repl = require 'coffee-script/repl'
vm = require 'vm'
util = require 'util'

Connection = require '../connection'
Model = require '../model'

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

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
    result = vm.runInThisContext js, filename
    if defer
      delete context.$
      return defer.promise
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
  context.getTimestamp = (object_id) ->
    new Date parseInt(object_id.substr(0, 8), 16) * 1000
  return

##
# Members of this object will be imported when a console is started
# @memberOf console
exports.public = {}

##
# Starts a CoffeeScript console
# @memberOf console
# @param {Object} options
exports.startCoffee = (options) ->
  options.inspect_depth or= 2
  if options.socket
    # Can't get the exact value?
    options.socket.columns = 100
  repl_server = repl.start
    input: options.socket or process.stdin
    output: options.socket or process.stdout
    prompt: 'cormo> '
    historyFile: path.join process.env.HOME, '.cormo_history' if process.env.HOME
    eval: evalCoffee
    writer: (object) ->
      util.inspect object, colors: true, depth: options.inspect_depth
    terminal: true
    useGlobal: true
  addArgCompleter repl_server
  setupContext repl_server.context, options
  return repl_server
