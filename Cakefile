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
  compileFiles 'src/connection'
  compileFiles 'src/model'
  compileFiles 'src/command'

task 'test', 'Runs Mocha tests', (options) ->
  process.env.NODE_ENV = 'test'
  command = './node_modules/.bin/mocha'
  args = ['-R', options.reporter or 'spec', '--compilers', 'coffee:coffee-script', '-r', 'coffee-script/register']
  args.push '-g', options.grep if options.grep
  spawn command, args, stdio: 'inherit'

task 'test:cov', 'Gets tests coverage', (options) ->
  process.env.NODE_ENV = 'test'
  process.env.TEST_COV = 1
  command = './node_modules/.bin/mocha'
  args = ['-R', 'html-cov', '--compilers', 'coffee:coffee-script', '-r', 'coffee-script/register']
  child = spawn command, args
  cov_html = fs.createWriteStream 'cov.html'
  child.stdout.on 'data', (data) ->
    cov_html.write data
  child.on 'exit', ->
    cov_html.end()

task 'doc', 'Make documents', ->
  command = './node_modules/.bin/crojsdoc'
  args = []
  spawn command, args, stdio: 'inherit'
