fs = require 'fs'
spawn = require('child_process').spawn

option '', '--reporter [name]', 'specify the reporter for Mocha to use'
option '', '--grep [pattern]', 'only run tests matching pattern'

runTest = (options, dirty_tracking, callback) ->
  process.env.NODE_ENV = 'test'
  process.env.DIRTY_TRACKING = dirty_tracking
  command = './node_modules/.bin/mocha'
  args = ['-R', options.reporter or 'spec', '--require', 'coffee-script/register', '--exit', 'test/**/*.{js,coffee}']
  args.push '-g', options.grep if options.grep
  child = spawn command, args, stdio: 'inherit'
  child.on 'exit', (code) ->
    return callback 'error' if code isnt 0
    callback null

task 'build', 'Builds JavaScript files from source', ->
  spawn 'npm', ['run', 'build'], stdio: 'inherit'

task 'test', 'Runs Mocha tests', (options) ->
  dirty_tracking = Math.floor(Math.random() * 2) isnt 0
  runTest options, dirty_tracking, (error) ->

task 'test:full', 'Runs Mocha full tests', (options) ->
  runTest options, true, (error) ->
    return if error
    runTest options, false, (error) ->
      return if error

task 'test:cov', 'Gets tests coverage', (options) ->
  process.env.CORMO_COVERAGE = 'true'
  process.env.NODE_ENV = 'test'
  command = './node_modules/.bin/mocha'
  args = ['-R', 'html-cov', '--compilers', 'coffee:coffee-script/register']
  child = spawn command, args
  cov_html = fs.createWriteStream 'cov.html'
  child.stdout.on 'data', (data) ->
    cov_html.write data
  child.on 'exit', ->
    cov_html.end()

task 'doc', 'Make documents', ->
  spawn 'npm', ['run', 'doc'], stdio: 'inherit'
