_g = require '../support/common'
{expect} = require 'chai'

module.exports = ->
  it 'sum all', ->
    records = await _g.connection.Order.group null, count: { $sum: 1 }, total: { $sum: '$price' }
    expect(records).to.have.length 1
    expect(records[0]).to.eql count: 9, total: 155
    return

  it 'sum some', ->
    records = await _g.connection.Order.where(price: $lt: 10 ).group(null, count: { $sum: 1 }, total: { $sum: '$price' })
    expect(records).to.have.length 1
    expect(records[0]).to.eql count: 2, total: 9
    return

  it 'sum by group', ->
    records = await _g.connection.Order.group 'customer', count: { $sum: 1 }, total: { $sum: '$price' }
    expect(records).to.have.length 3
    records.sort (a, b) -> if a.customer < b.customer then -1 else 1
    expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
    expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
    expect(records[2]).to.eql customer: 'John Doe', count: 4, total: 49
    return

  it 'order on group column', ->
    records = await _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer')
    expect(records).to.have.length 3
    expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
    expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
    expect(records[2]).to.eql customer: 'John Doe', count: 4, total: 49
    return

  it 'order on aggregated column', ->
    records = await _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).order('total')
    expect(records).to.have.length 3
    expect(records[0]).to.eql customer: 'Daniel Smith', count: 3, total: 30
    expect(records[1]).to.eql customer: 'John Doe', count: 4, total: 49
    expect(records[2]).to.eql customer: 'Bill Smith', count: 2, total: 76
    return

  it 'condition on group column', ->
    records = await _g.connection.Order.where(customer: $contains: 'smi').group('customer', count: { $sum: 1 }, total: { $sum: '$price' })
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.customer < b.customer then -1 else 1
    expect(records[0]).to.eql customer: 'Bill Smith', count: 2, total: 76
    expect(records[1]).to.eql customer: 'Daniel Smith', count: 3, total: 30
    return

  it 'condition on aggregated column', ->
    records = await _g.connection.Order.group('customer', count: { $sum: 1 }, total: { $sum: '$price' }).where(count: $gte: 3)
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.customer < b.customer then -1 else 1
    expect(records[0]).to.eql customer: 'Daniel Smith', count: 3, total: 30
    expect(records[1]).to.eql customer: 'John Doe', count: 4, total: 49
    return

  it 'group by multiple columns', ->
    records = await _g.connection.Order.group('customer date', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer date')
    expect(records).to.have.length 6
    expect(records[0]).to.eql customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76
    expect(records[1]).to.eql customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6
    expect(records[2]).to.eql customer: 'Daniel Smith', date: new Date('2012/04/23'), count: 2, total: 24
    expect(records[3]).to.eql customer: 'John Doe', date: new Date('2012/01/01'), count: 2, total: 31
    expect(records[4]).to.eql customer: 'John Doe', date: new Date('2012/09/23'), count: 1, total: 3
    expect(records[5]).to.eql customer: 'John Doe', date: new Date('2012/12/07'), count: 1, total: 15
    return

  it 'limit for group', ->
    records = await _g.connection.Order.group('customer date', count: { $sum: 1 }, total: { $sum: '$price' }).order('customer date').limit(2)
    expect(records).to.have.length 2
    expect(records[0]).to.eql customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76
    expect(records[1]).to.eql customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6
    return

  it 'min/max of all', ->
    records = await _g.connection.Order.group null, min_price: { $min: '$price' }, max_price: { $max: '$price' }
    expect(records).to.have.length 1
    expect(records[0]).to.eql min_price: 3, max_price: 60
    return

  it 'min/max by group', ->
    records = await _g.connection.Order.group 'customer', min_price: { $min: '$price' }, max_price: { $max: '$price' }
    expect(records).to.have.length 3
    records.sort (a, b) -> if a.customer < b.customer then -1 else 1
    expect(records[0]).to.eql customer: 'Bill Smith', min_price: 16, max_price: 60
    expect(records[1]).to.eql customer: 'Daniel Smith', min_price: 6, max_price: 13
    expect(records[2]).to.eql customer: 'John Doe', min_price: 3, max_price: 20
    return

  it 'explain', ->
    result = await _g.connection.Order.group(null, count: { $sum: 1 }, total: { $sum: '$price' }).explain()
    expect(result).to.not.eql [ {count: 9, total: 155} ]
    return

  it 'count of group', ->
    count = await _g.connection.Order.group('customer').count()
    expect(count).to.eql 3
    return

  it 'count of group with condition on group column', ->
    count = await _g.connection.Order.where(customer: $contains: 'smi').group('customer').count()
    expect(count).to.eql 2
    return

  it 'count of group with condition on aggregated column', ->
    count = await _g.connection.Order.group('customer', count: { $sum: 1 }).where(count: $gte: 3).count()
    expect(count).to.eql 2
    return
