spawn = require('child_process').spawn

option '', '--reporter [name]', 'specify the reporter for Mocha to use'
option '', '--grep [pattern]', 'only run tests matching pattern'

task 'test', 'Runs Mocha tests', (options) ->
  command = "./node_modules/.bin/mocha"
  args = ['-r', 'should', '-R', options.reporter or 'spec', '--compilers', 'coffee:coffee-script']
  args.push '-g', options.grep if options.grep
  spawn command, args, stdio: 'inherit'
