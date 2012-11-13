##
# Inflectors
# @module inflector

inflect = require 'inflect'

##
# Returns foreign_key for a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.foreign_key = (name) -> exports.underscore(name) + '_id'

##
# Returns pluralized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.pluralize = inflect.pluralize

##
# Returns singularized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.singularize = inflect.singularize

##
# Returns table name of a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.tableize = (name) -> exports.pluralize exports.underscore name

##
# Returns class name of a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.classify = (name) -> exports.camelize exports.singularize name

##
# Returns underscored string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.underscore = inflect.underscore

##
# Returns camelized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.camelize = inflect.camelize
