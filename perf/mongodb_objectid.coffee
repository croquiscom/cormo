Benchmark = require 'benchmark'
mongodb = require 'mongodb'
ObjectID = mongodb.ObjectID

suite = new Benchmark.Suite()

id_str = '1234567890abcdef12345678'
id_obj = new ObjectID id_str

suite.add 'new', ->
  for i in [0...1000]
    new ObjectID id_str

suite.add 'createFromHexString', ->
  for i in [0...1000]
    ObjectID.createFromHexString id_str

suite.add 'unpacked', ->
  for i in [0...1000]
    len = id_str.length
    if len is 24
      index = 0
      oid = ''
      while index < len
        number = parseInt(id_str.substr(index, 2), 16)
        break if number >= 256 or number < 0
        oid += String.fromCharCode number
        index += 2
      if index is len
        oid = new ObjectID oid
        continue
    console.log 'error'

suite.add 'unrolled', ->
  for i in [0...1000]
    len = id_str.length
    if len is 24
      oid = ''
      number = parseInt(id_str.substr(0, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(2, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(4, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(6, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(8, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(10, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(12, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(14, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(16, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(18, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(20, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(22, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      if oid.length is 12
        oid = new ObjectID oid
        continue
    console.log 'error'

suite.add 'unrolled - general object', ->
  for i in [0...1000]
    len = id_str.length
    if len is 24
      oid = ''
      number = parseInt(id_str.substr(0, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(2, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(4, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(6, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(8, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(10, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(12, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(14, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(16, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(18, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(20, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      number = parseInt(id_str.substr(22, 2), 16)
      oid += String.fromCharCode number if number>=0 and number<256
      if oid.length is 12
        oid = _bsontype: 'ObjectID', id_str: oid
        continue
    console.log 'error'

suite.add 'toString', ->
  for i in [0...1000]
    str = id_obj.toString()

suite.add 'toHexString', ->
  for i in [0...1000]
    str = id_obj.toHexString()

suite.add 'unpack', ->
  for i in [0...1000]
    oid = id_obj.id
    str = ''
    index = 0
    len = oid.length
    while index < len
      value = oid.charCodeAt index
      str += '0' if value < 16
      str += value.toString(16)
      index++

suite.add 'unrolled', ->
  for i in [0...1000]
    oid = id_obj.id
    str = ''
    value = oid.charCodeAt 0
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 1
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 2
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 3
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 4
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 5
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 6
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 7
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 8
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 9
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 10
    str += '0' if value < 16
    str += value.toString(16)
    value = oid.charCodeAt 11
    str += '0' if value < 16
    str += value.toString(16)

suite.on 'cycle', (event) ->
  console.log event.target.toString()

suite.run()
