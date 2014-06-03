net = require 'net'

##
# Connect to remote CORMO console
class CommandRemoteConsole
  ##
  # @param argv
  constructor: (argv) ->
    @argv = argv[3..]

  ##
  # Runs this command
  run: ->
    if @argv.length is 0
      @help()
      return
    socket = net.connect.apply net, @argv
    process.stdin.pipe socket
    socket.pipe process.stdout

    socket.on 'connect', ->
      process.stdin.setRawMode true
      return

    socket.once 'close', ->
      process.stdin.emit 'end'
      return

    process.stdin.on 'end', ->
      process.stdin.setRawMode false
      socket.end()
      console.log() # ensure newline
      return

    return

  ##
  # Shows help
  help: ->
    console.log 'Usage: cormo remote-console port [host]'
    console.log 'Usage: cormo remote-console path'
    return

module.exports = CommandRemoteConsole
