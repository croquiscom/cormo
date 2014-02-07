coffee = require 'coffee-script'
commander = require 'commander'
Fiber = require 'fibers'
Future = require 'fibers/future'
path = require 'path'
repl = require 'repl'
vm = require 'vm'
fs = require 'fs'
util = require 'util'

Connection = require '../connection'
Model = require '../model'
Query = require '../query'

console_future = require '../console_future'
console_future.execute = (callback, func) ->
  if typeof callback isnt 'function'
    future = new Future()
    callback = future.resolver()
  func callback
  if future
    return future.wait()

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

# from CoffeeScript repl.coffee
addMultilineHandler = (repl) ->
  {rli, inputStream, outputStream} = repl

  multiline =
    enabled: off
    initialPrompt: repl.prompt.replace /^[^> ]*/, (x) -> x.replace /./g, '-'
    prompt: repl.prompt.replace /^[^> ]*>?/, (x) -> x.replace /./g, '.'
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
        rli.setPrompt repl.prompt
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
addHistory = (repl, filename, maxSize) ->
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

  repl.rli.on 'exit', -> fs.close fd

  # Add a command to show the history stack
  repl.commands['.history'] =
    help: 'Show command history'
    action: ->
      repl.outputStream.write "#{repl.rli.history[..].reverse().join '\n'}\n"
      repl.displayPrompt()

addArgCompleter = (repl) ->
  rli = repl.rli
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

      repl.eval line, repl.context, 'repl', (error, obj) ->
        if typeof obj is 'function'
          rli.output.write '\r\n'
          argsMatch = obj.toString().match /^function\s*[^\(]*\(\s*([^\)]*)\)/m
          rli.output.write "#{line.trim()} \u001b[35m#{argsMatch[1]}\u001b[39m\r\n"
          rli._refreshLine()
        callback error, result

##
# CORMO console
class CommandConsole
  constructor: (argv) ->
    loads = []
    @inspect_depth = 2
    @program = program = new commander.Command('cormo')
    program.usage('console [options]')
      .option('-l, --load <path>', 'load specified module')
      .option('-d, --inspect-depth <depth>', 'specify depth for util.inspect')
      .on('load', (path) -> loads.push path)
      .on('inspect-depth', (depth) => @inspect_depth = depth)
    program.help() if argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0
    program.parse(argv)

    cwd = process.cwd()
    for load in loads
      console.log "Loading module '#{load}'..."
      try
        require load
      catch e
        try
          require path.resolve cwd, load
        catch e

  run: ->
    @runCoffee()

  runCoffee: ->
    repl = repl.start
      prompt: 'cormo> '
      eval: (cmd, context, filename, callback) ->
        Fiber( ->
          cmd = cmd.replace /\uFF00/g, '\n'
          cmd = cmd.replace /^\(([\s\S]*)\n\)$/m, '$1'
          return callback null if not cmd
          # apply future if command is ended with '$'
          use_future = /[, ]\$$/.test cmd
          if use_future
            future = new Future()
            context.$ = future.resolver()
          if /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s=/.test cmd
            assign_to = RegExp.$1
          try
            js = coffee.compile cmd, filename: filename, bare: true
            result = vm.runInContext js, context, filename
            if use_future
              result = future.wait()
              if assign_to
                context[assign_to] = result
              delete context.$
            else if result instanceof Query
              future = new Future()
              result.exec future.resolver()
              result = future.wait()
              if assign_to
                context[assign_to] = result
          catch e
            return callback prettyErrorMessage e, filename, cmd, true
          callback null, result
        ).run()
      writer: (object) =>
        util.inspect object, colors: true, depth: @inspect_depth
    repl.on 'exit', ->
      process.exit 0
    addMultilineHandler repl
    historyFile = path.join process.env.HOME, '.cormo_history' if process.env.HOME
    addHistory repl, historyFile, 10240 if historyFile
    addArgCompleter repl
    @_setupContext repl.context

  _setupContext: (context) ->
    context.Connection = Connection
    context.Model = Model
    context.connection = connection = Connection.defaultConnection
    if connection
      for model, modelClass of connection.models
        context[model] = modelClass
    connection.applySchemas()

module.exports = CommandConsole
