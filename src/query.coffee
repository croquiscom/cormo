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
    @_conditions = []
    @_options = {}
 
  ###
  # Finds a record by id
  # @param {String} id
  # @return {DBQuery} this
  ###
  find: (id) ->
    @_id = id
    return @

  ###
  # Finds records near target
  # @param {Object} target
  # @return {DBQuery} this
  ###
  near: (target) ->
    @_options.near = target
    return @

  ###
  # Finds records by condition
  # @param {Object} condition
  # @return {DBQuery} this
  ###
  where: (condition) ->
    if Array.isArray condition
      @_conditions.push.apply @_conditions, condition
    else if condition?
      @_conditions.push condition
    return @

  ###
  # Selects columns for result
  # @param {Object} columns
  # @return {DBQuery} this
  ###
  select: (columns) ->
    @_options.select = null
    schema_columns = Object.keys @_model._schema
    if typeof columns is 'string'
      columns = columns.split(/\s+/).filter (column) -> schema_columns.indexOf(column) >= 0
      @_options.select = columns
    return @

  ###
  # Sets limit of query
  # @param {Number} limit
  # @return {DBQuery} this
  ###
  limit: (limit) ->
    @_options.limit = limit
    return @

  ###
  # Executes the query
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  # @return {DBQuery} this
  ###
  exec: (callback) ->
    if @_id and @_conditions.length is 0
      @_adapter.findById @_name, @_id, @_options, (error, record) ->
        return callback error if error
        callback null, [record]
      return
    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_adapter.find @_name, @_conditions, @_options, callback

  ###
  # Executes the query as a count operation
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {DBQuery} this
  ###
  count: (callback) ->
    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_adapter.count @_name, @_conditions, callback

  ###
  # Executes the query as a delete operation
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {DBQuery} this
  ###
  delete: (callback) ->
    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_adapter.delete @_name, @_conditions, callback

module.exports = DBQuery
