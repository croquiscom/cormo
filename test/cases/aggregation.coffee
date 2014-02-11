{expect} = require 'chai'

module.exports = ->
  it 'sum all', (done) ->
    _g.connection.Order.group null, count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      return done error if error
      expect(records).to.have.length 1
      expect(records[0]).to.eql count: 9, total: 155
      done null

  it 'sum some', (done) ->
    _g.connection.Order.where(price: $lt: 10 ).group(null, count: { $sum: 1 }, total: { $sum: '$price' }).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 1
      expect(records[0]).to.eql count: 2, total: 9
      done null

  it 'sum by group', (done) ->
    _g.connection.Order.group 'customer', count: { $sum: 1 }, total: { $sum: '$price' }, (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
      expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
      expect(records[2]).to.eql customer: 'John Doe', count: 4, total: 49
      done null

  it 'order on group column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer').exec (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
      expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
      expect(records[2]).to.eql customer: 'John Doe', count: 4, total: 49
      done null

  it 'order on aggregated column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('total').exec (error, records) ->
      return done error if error
      expect(records).to.have.length 3
      expect(records[0]).to.eql customer: 'Daniel Smith', count: 3, total: 30
      expect(records[1]).to.eql customer: 'John Doe', count: 4, total: 49
      expect(records[2]).to.eql customer: 'Bill Smith', count: 2, total: 76
      done null

  it 'condition on group column', (done) ->
    _g.connection.Order.where(customer: $contains: 'smi').group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 2
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
      expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
      done null

  it 'condition on aggregated column', (done) ->
    _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).where(count: $gte: 3).exec (error, records) ->
      return done error if error
      expect(records).to.have.length 2
      records.sort (a, b) -> if a.customer < b.customer then -1 else 1
      expect(records[0]).to.eql customer: 'Daniel Smith', count: 3, total: 30
      expect(records[1]).to.eql customer: 'John Doe', count: 4, total: 49
      done null

  it 'group by multiple columns', (done) ->
    _g.connection.Order.group('customer date', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer date').exec (error, records) ->
      return done error if error
      expect(records).to.have.length 6
      expect(records[0]).to.eql customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76
      expect(records[1]).to.eql customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6
      expect(records[2]).to.eql customer: 'Daniel Smith', date: new Date('2012/04/23'), count: 2, total: 24
      expect(records[3]).to.eql customer: 'John Doe', date: new Date('2012/01/01'), count: 2, total: 31
      expect(records[4]).to.eql customer: 'John Doe', date: new Date('2012/09/23'), count: 1, total: 3
      expect(records[5]).to.eql customer: 'John Doe', date: new Date('2012/12/07'), count: 1, total: 15
      done null
