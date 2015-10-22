commander = require 'commander'
cormo_console = require '../util/console'
{resolve} = require 'path'
net = require 'net'

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
    .option '-s, --serve <port>', 'serve console at port'
    .option '--javascript', 'using JavaScript instead of CoffeeScript'
    .on 'load', (path) ->
      loads.push path
    .on 'inspect-depth', (depth) =>
      @inspect_depth = depth
    .on 'serve', (port) =>
      @serve_port = port
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
    @startConsole if @language is 'javascript' then 'JS' else 'Coffee'

  ##
  # Starts a console
  startConsole: (type) ->
    if @serve_port
      server = net.createServer (socket) =>
        cormo_console['start'+type] inspect_depth: @inspect_depth, socket: socket
        .on 'exit', ->
          socket.end()
      .listen @serve_port
    cormo_console['start'+type] inspect_depth: @inspect_depth
    .on 'exit', ->
      process.exit 0

module.exports = CommandConsole
