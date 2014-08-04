commander = require 'commander'
cormo_console = require '../util/console'
{resolve} = require 'path'

##
# CORMO console
class CommandConsole
  ##
  # @param argv
  constructor: (argv) ->
    loads = []
    program = new commander.Command('cormo')
    program.usage 'console [options]'
    .option '-l, --load <path>', 'load specified module'
    .option '-d, --inspect-depth <depth>', 'specify depth for util.inspect'
    .on 'load', (path) ->
      loads.push path
    .on 'inspect-depth', (depth) =>
      @inspect_depth = depth
    program.help() if argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0
    program.parse(argv)

    require 'coffee-script/register'

    cwd = process.cwd()
    for load in loads
      console.log "Loading module '#{load}'..."
      try
        require load
      catch e
        console.log e.toString() if e.code isnt 'MODULE_NOT_FOUND'
        try
          require resolve cwd, load
        catch e
          console.log e.toString() if e.code isnt 'MODULE_NOT_FOUND'

  ##
  # Runs this command
  run: ->
    @startCoffee()

  ##
  # Starts a CoffeeScript console
  startCoffee: ->
    cormo_console.startCoffee inspect_depth: @inspect_depth
    .on 'exit', ->
      process.exit 0

module.exports = CommandConsole
