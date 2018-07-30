import { Query } from '../query';

/**
 * Model query
 * @namespace model
 */
class ModelQuery {
  static _createQueryAndRun(criteria, data) {
    var query;
    query = new Query(this);
    query[criteria](data);
    return query;
  }

  static _createOptionalQueryAndRun(criteria, data) {
    return this._createQueryAndRun(criteria, data);
  }

  //#
  // Creates q query object
  static query() {
    return new Query(this);
  }

  //#
  // Finds a record by id
  // @param {RecordID|Array<RecordID>} id
  // @return {Query}
  // @throws {Error('not found')}
  static find(id) {
    return this._createQueryAndRun('find', id);
  }

  //#
  // Finds records by ids while preserving order.
  // @param {Array<RecordID>} ids
  // @return {Query}
  // @throws {Error('not found')}
  static findPreserve(ids) {
    return this._createQueryAndRun('findPreserve', ids);
  }

  //#
  // Finds records by conditions
  // @param {Object} [condition]
  // @return {Query}
  static where(condition) {
    return this._createOptionalQueryAndRun('where', condition);
  }

  //#
  // Selects columns for result
  // @param {String} [columns]
  // @return {Query}
  static select(columns) {
    return this._createOptionalQueryAndRun('select', columns);
  }

  //#
  // Specifies orders of result
  // @param {String} [orders]
  // @return {Query}
  static order(orders) {
    return this._createOptionalQueryAndRun('order', orders);
  }

  //#
  // Groups result records
  // @param {String} group_by
  // @param {Object} fields
  // @return {Query}
  static group(group_by, fields) {
    var query;
    query = new Query(this);
    query.group(group_by, fields);
    return query;
  }

  //#
  // Counts records by conditions
  // @param {Object} [condition]
  // @return {Number}
  // @promise
  static async count(condition) {
    return (await new Query(this).where(condition).count());
  }

  //#
  // Updates some fields of records that match conditions
  // @param {Object} updates
  // @param {Object} [condition]
  // @return {Number}
  // @promise
  static async update(updates, condition) {
    return (await new Query(this).where(condition).update(updates));
  }

  //#
  // Deletes records by conditions
  // @param {Object} [condition]
  // @return {Number}
  // @promise
  static async delete(condition) {
    return (await new Query(this).where(condition).delete());
  }
}

export { ModelQuery };
