# common modules to test cases

global.async = require 'async'

global.Connection = require('../index').Connection
global.Model = require('../index').Model

# 'global.should =' does not work because should module override Object.prototype.should
Object.defineProperty global, 'should', value: require 'should'
