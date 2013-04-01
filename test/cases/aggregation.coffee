module.exports = ->
  it 'sum all', (done) ->
    _g.connection.Order.group null, count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      records.should.have.length 1
      records[0].should.have.keys 'count', 'total'
      records[0].count.should.equal 9
      records[0].total.should.equal 103
      done null

  it 'sum some', (done) ->
    _g.connection.Order.where(price: $lt: 10 ).group(null, count: { $sum: 1 }, total: { $sum: '$price' }).exec (error, records) ->
      records.should.have.length 1
      records[0].should.have.keys 'count', 'total'
      records[0].count.should.equal 3
      records[0].total.should.equal 17
      done null

  it 'sum by group', (done) ->
    _g.connection.Order.group 'customer', count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      records.should.have.length 3
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      records[0].should.have.keys 'customer', 'count', 'total'
      records[0].customer.should.equal 'Bill Smith'
      records[0].count.should.equal 2
      records[0].total.should.equal 24
      records[1].should.have.keys 'customer', 'count', 'total'
      records[1].customer.should.equal 'Daniel Smith'
      records[1].count.should.equal 3
      records[1].total.should.equal 30
      records[2].should.have.keys 'customer', 'count', 'total'
      records[2].customer.should.equal 'John Doe'
      records[2].count.should.equal 4
      records[2].total.should.equal 49
      done null
