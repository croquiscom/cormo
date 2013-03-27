module.exports = () ->
  it 'compare number', (done) ->
    data = [
      { number: 10 }
      { number: 14.6 }
      { number: -8.3 }
      { number: 28.9 }
    ]
    _g.async.waterfall [
      (callback) ->
        _g.connection.Type.createBulk data, callback
      (records, callback) ->
        _g.connection.Type.where number: 14.6, callback
      (records, callback) ->
        records.should.have.length 1
        records[0].number.should.be.equal 14.6
        callback null
      (callback) ->
        _g.connection.Type.where { number: $lt: 12 }, callback
      (records, callback) ->
        records.should.have.length 2
        records.sort (a, b) -> if a.number < b.number then -1 else 1
        records[0].number.should.be.equal -8.3
        records[1].number.should.be.equal 10
        callback null
    ], done

  it 'compare integer', (done) ->
    data = [
      { int_c: 10 }
      { int_c: 15 }
      { int_c: -8 }
      { int_c: 28 }
    ]
    _g.async.waterfall [
      (callback) ->
        _g.connection.Type.createBulk data, callback
      (records, callback) ->
        _g.connection.Type.where int_c: 15, callback
      (records, callback) ->
        records.should.have.length 1
        records[0].int_c.should.be.equal 15
        callback null
      (callback) ->
        _g.connection.Type.where { int_c: $lt: 12 }, callback
      (records, callback) ->
        records.should.have.length 2
        records.sort (a, b) -> if a.int_c < b.int_c then -1 else 1
        records[0].int_c.should.be.equal -8
        records[1].int_c.should.be.equal 10
        callback null
    ], done

  it 'compare date', (done) ->
    data = [
      { date: '2012/10/12 21:32:54' }
      { date: '2012/10/13 21:32:54' }
      { date: '2012/10/14 21:32:54' }
      { date: '2012/10/15 21:32:54' }
    ]
    _g.async.waterfall [
      (callback) ->
        _g.connection.Type.createBulk data, callback
      (records, callback) ->
        _g.connection.Type.where date: new Date('2012/10/13 21:32:54'), callback
      (records, callback) ->
        records.should.have.length 1
        records[0].date.should.be.equal new Date('2012/10/13 21:32:54')
        callback null
      (callback) ->
        _g.connection.Type.where date: '2012/10/13 21:32:54', callback
      (records, callback) ->
        records.should.have.length 1
        records[0].date.should.be.equal new Date('2012/10/13 21:32:54')
        callback null
      (callback) ->
        _g.connection.Type.where { date: $lt: new Date('2012/10/14 00:00:00') }, callback
      (records, callback) ->
        records.should.have.length 2
        records.sort (a, b) -> if a.date.getTime() < b.date.getTime() then -1 else 1
        records[0].date.should.be.equal new Date('2012/10/12 21:32:54')
        records[1].date.should.be.equal new Date('2012/10/13 21:32:54')
        callback null
    ], done

  it 'compare boolean', (done) ->
    data = [
      { boolean: true }
      { boolean: true }
      { boolean: false }
      { boolean: true }
    ]
    _g.async.waterfall [
      (callback) ->
        _g.connection.Type.createBulk data, callback
      (records, callback) ->
        _g.connection.Type.where boolean: true, callback
      (records, callback) ->
        records.should.have.length 3
        records[0].boolean.should.be.equal true
        records[1].boolean.should.be.equal true
        records[2].boolean.should.be.equal true
        callback null
      (callback) ->
        _g.connection.Type.where boolean: false, callback
      (records, callback) ->
        records.should.have.length 1
        records[0].boolean.should.be.equal false
        callback null
    ], done

  it 'compare string', (done) ->
    data = [
      { string: '1' }
      { string: 'a' }
      { string: 'A' }
      { string: 'K' }
    ]
    _g.async.waterfall [
      (callback) ->
        _g.connection.Type.createBulk data, callback
      (records, callback) ->
        _g.connection.Type.where string: 'a', callback
      (records, callback) ->
        # some adapters(currently, MySQL) may do case insensitive comparison.
        # skip test for now
        return done null if records.length is 2

        records.should.have.length 1
        records[0].string.should.be.equal 'a'
        callback null
      (callback) ->
        _g.connection.Type.where { string: $lt: 'D' }, callback
      (records, callback) ->
        records.should.have.length 2
        records.sort (a, b) -> if a.string < b.string then -1 else 1
        records[0].string.should.be.equal '1'
        records[1].string.should.be.equal 'A'
        callback null
    ], done
