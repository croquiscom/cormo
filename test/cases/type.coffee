should = require 'should'
async = require 'async'

module.exports = (models) ->
  it 'number', (done) ->
    data = [
      [ '30', 30 ]
      [ '12.8', 12.8 ]
      [ '8a', NaN ]
      [ 'abc', NaN ]
    ]
    async.forEach data, (item, callback) ->
        models.Type.create { number: item[0] }, (error, type) ->
          if isNaN item[1]
            should.exist error
            error.message.should.be.equal "'number' is not a number"
            return callback null
          return callback error if error
          type.number.should.be.equal item[1]
          models.Type.find type.id, (error, type) ->
            return callback error if error
            type.number.should.be.equal item[1]
            callback null
      , (error) ->
        done error

  it 'integer', (done) ->
    data = [
      [ '30', 30 ]
      [ '12.8', NaN ]
      [ '8a', NaN ]
      [ 'abc', NaN ]
    ]
    async.forEach data, (item, callback) ->
        models.Type.create { int_c: item[0] }, (error, type) ->
          if isNaN item[1]
            should.exist error
            error.message.should.be.equal "'int_c' is not an integer"
            return callback null
          return callback error if error
          type.int_c.should.be.equal item[1]
          models.Type.find type.id, (error, type) ->
            return callback error if error
            type.int_c.should.be.equal item[1]
            callback null
      , (error) ->
        done error
