coffee = require 'coffee-script'
commander = require 'commander'
Fiber = require 'fibers'
Future = require 'fibers/future'
path = require 'path'
repl = require 'repl'
vm = require 'vm'

Connection = require '../connection'

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

##
# CORMO console
class CommandConsole
  constructor: (argv) ->
    loads = []
    @program = program = new commander.Command('cormo')
    program.usage('console [options]')
      .option('-l, --load <path>', 'load specified module')
      .on('load', (path) -> loads.push path)
    program.help() if argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0
    program.parse(argv)

    try
      cwd = process.cwd()
      for load in loads
        console.log "Loading module '#{load}'..."
        require path.resolve cwd, load

  run: ->
    @runCoffee()

  runCoffee: ->
    repl = repl.start
      prompt: 'cormo> '
      eval: (cmd, context, filename, callback) ->
        Fiber( ->
          cmd = cmd.substr(1, cmd.length-2).trim() if cmd[0] is '(' and cmd[cmd.length-1] is ')'
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
          catch e
            return callback prettyErrorMessage e, filename, cmd, true
          callback null, result
        ).run()
    repl.on 'exit', ->
      process.exit 0
    @_setupContext repl.context

  _setupContext: (context) ->
    context.connection = connection = Connection.defaultConnection
    for model, modelClass of connection.models
      context[model] = modelClass

module.exports = CommandConsole
