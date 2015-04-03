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
    .option '--javascript', 'using JavaScript instead of CoffeeScript'
    .on 'load', (path) ->
      loads.push path
    .on 'inspect-depth', (depth) =>
      @inspect_depth = depth
    .on 'javascript', =>
      @language = 'javascript'
    program.help() if argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0
    program.parse(argv)

    require 'coffee-script/register'

    cwd = process.cwd()
    for load in loads
      console.log "Loading module '#{load}'..."
      try
        path = resolve cwd, load
        require path
      catch e
        if e.code is 'MODULE_NOT_FOUND' and RegExp("'" + path + "'$").test e.message
          try
            require load
          catch e
            console.log e.toString()
        else
          console.log e.toString()

  ##
  # Runs this command
  run: ->
    if @language is 'javascript'
      @startJS()
    else
      @startCoffee()

  ##
  # Starts a CoffeeScript console
  startCoffee: ->
    cormo_console.startCoffee inspect_depth: @inspect_depth
    .on 'exit', ->
      process.exit 0

  ##
  # Starts a JavaScript console
  startJS: ->
    cormo_console.startJS inspect_depth: @inspect_depth
    .on 'exit', ->
      process.exit 0

module.exports = CommandConsole
