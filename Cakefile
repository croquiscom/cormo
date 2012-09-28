fs = require 'fs'
spawn = require('child_process').spawn

option '', '--reporter [name]', 'specify the reporter for Mocha to use'
option '', '--grep [pattern]', 'only run tests matching pattern'

task 'build', 'Builds JavaScript files from source', ->
  compileFiles = (dir) ->
    files = fs.readdirSync dir
    files = ("#{dir}/#{file}" for file in files when file.match /\.coffee$/)
    command = 'coffee'
    args = [ '-c', '-o', dir.replace('src', 'lib') ].concat files
    spawn command, args, stdio: 'inherit'
  compileFiles 'src'
  compileFiles 'src/adapters'

task 'test', 'Runs Mocha tests', (options) ->
  command = './node_modules/.bin/mocha'
  args = ['-r', 'should', '-R', options.reporter or 'spec', '--compilers', 'coffee:coffee-script']
  args.push '-g', options.grep if options.grep
  spawn command, args, stdio: 'inherit'
