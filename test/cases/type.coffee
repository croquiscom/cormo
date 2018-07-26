_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'number', ->
    data = [
      [ '30', 30 ]
      [ '12.8', 12.8 ]
      [ '8a', null ]
      [ 'abc', null ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { number: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.number).to.equal item[1]
        type = await _g.connection.Type.find type.id
        expect(type.number).to.equal item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'number' is not a number"
    return

  it 'integer', ->
    data = [
      [ '30', 30 ]
      [ '9876543210', null ]
      [ '12.8', null ]
      [ '8a', null ]
      [ 'abc', null ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { int_c: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.int_c).to.equal item[1]
        type = await _g.connection.Type.find type.id
        expect(type.int_c).to.equal item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'int_c' is not an integer"
    return

  it 'date', ->
    data = [
      [ '2012/10/12 21:32:54', new Date('2012/10/12 21:32:54').getTime() ]
      [ '2012-09-11 20:31:53', new Date('2012/09/11 20:31:53').getTime() ]
      [ '2012/11/02', new Date('2012/11/02 00:00:00').getTime() ]
      [ '2012/10/12 34:00:00', null ]
      [ '2012/13/01', null ]
      [ new Date('2013/01/12 03:42:21').getTime(), new Date('2013/01/12 03:42:21').getTime() ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { date: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.date).to.be.an.instanceof Date
        expect(type.date.getTime()).to.equal item[1]
        type = await _g.connection.Type.find type.id
        expect(type.date).to.be.an.instanceof Date
        expect(type.date.getTime()).to.equal item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'date' is not a date"
    return

  it 'date with fractional seconds', ->
    if not _g.connection.adapter.support_fractional_seconds
      return

    data = [
      [ '2012/10/12 21:32:54.123', new Date('2012/10/12 21:32:54.123').getTime() ]
      [ '2012/10/12 21:32:54.619', new Date('2012/10/12 21:32:54.619').getTime() ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { date: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.date).to.be.an.instanceof Date
        expect(type.date.getTime()).to.equal item[1]
        type = await _g.connection.Type.find type.id
        expect(type.date).to.be.an.instanceof Date
        expect(type.date.getTime()).to.equal item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'date' is not a date"
    return

  it 'boolean', ->
    data = [
      [ true, true ]
      [ false, false ]
      [ 'str', null ]
      [ 5, null ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { boolean: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.boolean).to.equal item[1]
        type = await _g.connection.Type.find type.id
        expect(type.boolean).to.equal item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'boolean' is not a boolean"
    return

  it 'object', ->
    data = [
      [ '30', '30' ]
      [ 30, 30 ]
      [ true, true ]
      [ false, false ]
      [ {a: 5, b: ['oh']}, {a: 5, b: ['oh']} ]
    ]
    for item in data
      type = await _g.connection.Type.create { object: item[0] }
      if typeof item[1] is 'object'
        expect(type.object).to.eql item[1]
      else
        expect(type.object).to.equal item[1]
      type = await _g.connection.Type.find type.id
      if typeof item[1] is 'object'
        expect(type.object).to.eql item[1]
      else
        expect(type.object).to.equal item[1]
    return

  it 'array of integer', ->
    data = [
      [ [9,'30'], [9,30] ]
      [ 9, null ]
      [ [9,'12.8'], null ]
    ]
    for item in data
      try
        type = await _g.connection.Type.create { int_array: item[0] }
        if item[1] is null
          throw new Error 'must throw an error.'
        expect(type.int_array).to.eql item[1]
        type = await _g.connection.Type.find type.id
        expect(type.int_array).to.eql item[1]
      catch error
        expect(error).to.exist
        expect(error.message).to.equal "'int_array' is not an array"
    return

  it 'array of recordid', ->
    types = await _g.connection.Type.createBulk [ { int_c: 1 }, { int_c: 2 }, { int_c: 3 } ]
    type_ids = [types[0].id, null, types[1].id, types[2].id, null]
    type = await _g.connection.Type.create recordid_array: type_ids
    expect(type.recordid_array).to.eql type_ids
    type = await _g.connection.Type.find type.id
    expect(type.recordid_array).to.eql type_ids
    return

  it 'array of recordid with lean', ->
    types = await _g.connection.Type.createBulk [ { int_c: 1 }, { int_c: 2 }, { int_c: 3 } ]
    type_ids = [types[0].id, null, types[1].id, types[2].id, null]
    type = await _g.connection.Type.create recordid_array: type_ids
    expect(type.recordid_array).to.eql type_ids
    type = await _g.connection.Type.find(type.id).lean()
    expect(type.recordid_array).to.eql type_ids
    return
