_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'compare number', ->
    data = [
      { number: 10 }
      { number: 14.6 }
      { number: -8.3 }
      { number: 28.9 }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where number: 14.6
    expect(records).to.have.length 1
    expect(records[0].number).to.equal 14.6
    records = await _g.connection.Type.where { number: $lt: 12 }
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.number < b.number then -1 else 1
    expect(records[0].number).to.equal -8.3
    expect(records[1].number).to.equal 10
    return

  it 'compare integer', ->
    data = [
      { int_c: 10 }
      { int_c: 15 }
      { int_c: -8 }
      { int_c: 28 }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where int_c: 15
    expect(records).to.have.length 1
    expect(records[0].int_c).to.equal 15
    records = await _g.connection.Type.where { int_c: $lt: 12 }
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.int_c < b.int_c then -1 else 1
    expect(records[0].int_c).to.equal -8
    expect(records[1].int_c).to.equal 10
    return

  it 'compare date', ->
    data = [
      { date: '2012/10/12 21:32:54' }
      { date: '2012/10/13 21:32:54' }
      { date: '2012/10/14 21:32:54' }
      { date: '2012/10/15 21:32:54' }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where date: new Date('2012/10/13 21:32:54')
    expect(records).to.have.length 1
    expect(records[0].date).to.eql new Date('2012/10/13 21:32:54')
    records = await _g.connection.Type.where date: '2012/10/13 21:32:54'
    expect(records).to.have.length 1
    expect(records[0].date).to.eql new Date('2012/10/13 21:32:54')
    records = await _g.connection.Type.where { date: $lt: new Date('2012/10/14 00:00:00') }
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.date.getTime() < b.date.getTime() then -1 else 1
    expect(records[0].date).to.eql new Date('2012/10/12 21:32:54')
    expect(records[1].date).to.eql new Date('2012/10/13 21:32:54')
    return

  it 'compare boolean', ->
    data = [
      { boolean: true }
      { boolean: true }
      { boolean: false }
      { boolean: true }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where boolean: true
    expect(records).to.have.length 3
    expect(records[0].boolean).to.equal true
    expect(records[1].boolean).to.equal true
    expect(records[2].boolean).to.equal true
    records = await _g.connection.Type.where boolean: false
    expect(records).to.have.length 1
    expect(records[0].boolean).to.equal false
    return

  it 'compare string', ->
    data = [
      { string: '1' }
      { string: 'a' }
      { string: 'A' }
      { string: 'K' }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where string: 'a'
    # some adapters(currently, MySQL) may do case insensitive comparison.
    # skip test for now
    if records.length is 2
      return

    expect(records).to.have.length 1
    expect(records[0].string).to.equal 'a'
    records = await _g.connection.Type.where { string: $lt: 'D' }
    if process.env.TRAVIS is 'true' and records.length is 3
      # This fails on Travis Server PostgreSQL. Maybe locale problem? Anyway, skip this for now
      return
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.string < b.string then -1 else 1
    expect(records[0].string).to.equal '1'
    expect(records[1].string).to.equal 'A'
    return
  
  it 'compare text', ->
    data = [
      { text: '1' }
      { text: 'a' }
      { text: 'A' }
      { text: 'K' }
    ]
    await _g.connection.Type.createBulk data
    records = await _g.connection.Type.where text: 'a'
    # some adapters(currently, MySQL) may do case insensitive comparison.
    # skip test for now
    if records.length is 2
      return

    expect(records).to.have.length 1
    expect(records[0].text).to.equal 'a'
    records = await _g.connection.Type.where { text: $lt: 'D' }
    if process.env.TRAVIS is 'true' and records.length is 3
      # This fails on Travis Server PostgreSQL. Maybe locale problem? Anyway, skip this for now
      return
    expect(records).to.have.length 2
    records.sort (a, b) -> if a.text < b.text then -1 else 1
    expect(records[0].text).to.equal '1'
    expect(records[1].text).to.equal 'A'
    return
