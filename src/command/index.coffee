path = require 'path'

##
# Supports command line interface
# @static
class Command
  ##
  # Runs a command
  # @param {Array<String>} argv
  @run: (argv) ->
    command = argv[2]
    if not command
      console.log 'Usage: cormo <command>'
      return
    try
      CommandClass = require path.resolve __dirname, '..', 'command', command
    catch
      console.log "Cannot find a CORMO command #{command}"
      return
    command = new CommandClass argv
    command.run()

module.exports = Command
