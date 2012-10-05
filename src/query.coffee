###
# Collects conditions to query
###
class DBQuery
  ###
  # Creates a query instance
  # @param {Class} model
  ###
  constructor: (model) ->
    @_model = model
    @_name = model._name
    @_adapter = model._connection._adapter
    @_conditions = {}
 
  ###
  # Finds a record by id
  # @param {String} id
  # @return {DBQuery} this
  ###
  find: (id) ->
    @_id = id
    return @

  where: (conditions) ->
    target = @_conditions
    for own field of conditions
      target[field] = conditions[field]
    return @

  ###
  # Executes the query
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  # @return {DBQuery} this
  ###
  exec: (callback) ->
    if @_id
      @_adapter.findById @_name, @_id, (error, record) ->
        return callback error if error
        callback null, [record]
    else
      @_adapter.find @_name, @_conditions, callback

module.exports = DBQuery
