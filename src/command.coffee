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
    CommandClass = require path.resolve __dirname, 'command', command
    command = new CommandClass argv
    command.run()

module.exports = Command
