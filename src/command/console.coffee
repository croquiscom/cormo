coffee = require 'coffee-script'
repl = require 'repl'
vm = require 'vm'

prettyErrorMessage = coffee.helpers.prettyErrorMessage or (e) -> e

##
# CORMO console
class CommandConsole
  constructor: (argv) ->

  run: ->
    @runCoffee()

  runCoffee: ->
    repl.start
      prompt: 'cormo> '
      eval: (cmd, context, filename, callback) ->
        return callback null if cmd[0] is '(' and cmd[cmd.length-1] is ')' and not cmd.substr(1, cmd.length-2).trim()
        try
          js = coffee.compile cmd, filename: filename, bare: true
          result = vm.runInContext js, context, filename
        catch e
          return callback prettyErrorMessage e, filename, cmd, true
        callback null, result

module.exports = CommandConsole
