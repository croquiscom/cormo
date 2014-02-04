{expect} = require 'chai'

module.exports = ->
  it 'sum all', (done) ->
    _g.connection.Order.group null, count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      return done error if error
      expect(records).to.have.length 1
      expect(records[0]).to.have.keys 'count', 'total'
      expect(records[0].count).to.equal 9
      expect(records[0].total).to.equal 155
      done null

  it 'sum some', (done) ->
    _g.connection.Order.where(price: $lt: 10 ).group(null, count: { $sum: 1 }, total: { $sum: '$price' }).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 1
      expect(records[0]).to.have.keys 'count', 'total'
      expect(records[0].count).to.equal 2
      expect(records[0].total).to.equal 9
      done null

  it 'sum by group', (done) ->
    _g.connection.Order.group 'customer', count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.have.keys 'customer', 'count', 'total'
      expect(records[0].customer).to.equal 'Bill Smith'
      expect(records[0].count).to.equal 2
      expect(records[0].total).to.equal 76
      expect(records[1]).to.have.keys 'customer', 'count', 'total'
      expect(records[1].customer).to.equal 'Daniel Smith'
      expect(records[1].count).to.equal 3
      expect(records[1].total).to.equal 30
      expect(records[2]).to.have.keys 'customer', 'count', 'total'
      expect(records[2].customer).to.equal 'John Doe'
      expect(records[2].count).to.equal 4
      expect(records[2].total).to.equal 49
      done null

  it 'order on group column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer').exec (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      expect(records[0]).to.have.keys 'customer', 'count', 'total'
      expect(records[0].customer).to.equal 'Bill Smith'
      expect(records[0].count).to.equal 2
      expect(records[0].total).to.equal 76
      expect(records[1]).to.have.keys 'customer', 'count', 'total'
      expect(records[1].customer).to.equal 'Daniel Smith'
      expect(records[1].count).to.equal 3
      expect(records[1].total).to.equal 30
      expect(records[2]).to.have.keys 'customer', 'count', 'total'
      expect(records[2].customer).to.equal 'John Doe'
      expect(records[2].count).to.equal 4
      expect(records[2].total).to.equal 49
      done null

  it 'order on aggregated column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('total').exec (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      expect(records[0]).to.have.keys 'customer', 'count', 'total'
      expect(records[0].customer).to.equal 'Daniel Smith'
      expect(records[0].count).to.equal 3
      expect(records[0].total).to.equal 30
      expect(records[1]).to.have.keys 'customer', 'count', 'total'
      expect(records[1].customer).to.equal 'John Doe'
      expect(records[1].count).to.equal 4
      expect(records[1].total).to.equal 49
      expect(records[2]).to.have.keys 'customer', 'count', 'total'
      expect(records[2].customer).to.equal 'Bill Smith'
      expect(records[2].count).to.equal 2
      expect(records[2].total).to.equal 76
      done null

  it 'condition on group column', (done) ->
    _g.connection.Order.where(customer: $contains: 'smi').group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 2
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.have.keys 'customer', 'count', 'total'
      expect(records[0].customer).to.equal 'Bill Smith'
      expect(records[0].count).to.equal 2
      expect(records[0].total).to.equal 76
      expect(records[1]).to.have.keys 'customer', 'count', 'total'
      expect(records[1].customer).to.equal 'Daniel Smith'
      expect(records[1].count).to.equal 3
      expect(records[1].total).to.equal 30
      done null

  it 'condition on aggregated column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).where(count: $gte: 3).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 2
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.have.keys 'customer', 'count', 'total'
      expect(records[0].customer).to.equal 'Daniel Smith'
      expect(records[0].count).to.equal 3
      expect(records[0].total).to.equal 30
      expect(records[1]).to.have.keys 'customer', 'count', 'total'
      expect(records[1].customer).to.equal 'John Doe'
      expect(records[1].count).to.equal 4
      expect(records[1].total).to.equal 49
      done null
