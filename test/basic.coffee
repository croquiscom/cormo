DBConnection = require '../index'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe db, ->
    connection = undefined
    connect = (callback) ->
      connection = new DBConnection db, _dbs[db]
      if connection.connected
        callback()
      else
        connection.on 'connected', callback
        connection.on 'error', (error) ->
          callback error

    before (done) ->
      connect done

    require('./cases/basic')()
