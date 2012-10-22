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
      [ '9876543210', NaN ]
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

  it 'date', (done) ->
    data = [
      [ '2012/10/12 21:32:54', new Date('2012/10/12 21:32:54').getTime() ]
      [ '2012-09-11 20:31:53', new Date('2012/09/11 20:31:53').getTime() ]
      [ '2012/11/02', new Date('2012/11/02 00:00:00').getTime() ]
      [ '2012/10/12 34:00:00', NaN ]
      [ '2012/13/01', NaN ]
      [ new Date('2013/01/12 03:42:21').getTime(), new Date('2013/01/12 03:42:21').getTime() ]
    ]
    async.forEach data, (item, callback) ->
        models.Type.create { date: item[0] }, (error, type) ->
          if isNaN item[1]
            should.exist error
            error.message.should.be.equal "'date' is not a date"
            return callback null
          return callback error if error
          new should.Assertion(type.date).be.an.instanceof Date
          type.date.getTime().should.be.equal item[1]
          models.Type.find type.id, (error, type) ->
            return callback error if error
            new should.Assertion(type.date).be.an.instanceof Date
            type.date.getTime().should.be.equal item[1]
            callback null
      , (error) ->
        done error
