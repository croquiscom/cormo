coffee = require 'coffee-script'
commander = require 'commander'
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
        return callback null if cmd[0] is '(' and cmd[cmd.length-1] is ')' and not cmd.substr(1, cmd.length-2).trim()
        try
          js = coffee.compile cmd, filename: filename, bare: true
          result = vm.runInContext js, context, filename
        catch e
          return callback prettyErrorMessage e, filename, cmd, true
        callback null, result
    repl.on 'exit', ->
      process.exit 0
    @_setupContext repl.context

  _setupContext: (context) ->
    context.connection = connection = Connection.defaultConnection
    for model, modelClass of connection.models
      context[model] = modelClass

module.exports = CommandConsole
