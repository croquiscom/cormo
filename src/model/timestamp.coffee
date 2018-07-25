##
# Timestamps
# @namespace model
ModelTimestampMixin = (Base) -> class extends Base
  ##
  # Adds 'created_at' and 'updated_at' fields to records
  @timestamps: ->
    @column 'created_at', Date
    @column 'updated_at', Date
    @beforeCreate ->
      d = new Date()
      @created_at = @updated_at = d
    @beforeUpdate ->
      d = new Date()
      @updated_at = d

module.exports = ModelTimestampMixin
