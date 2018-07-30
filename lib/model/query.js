"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("../query");
/**
 * Model query
 * @namespace model
 */
class ModelQuery {
    static _createQueryAndRun(criteria, data) {
        var query;
        query = new query_1.Query(this);
        query[criteria](data);
        return query;
    }
    static _createOptionalQueryAndRun(criteria, data) {
        return this._createQueryAndRun(criteria, data);
    }
    //#
    // Creates q query object
    static query() {
        return new query_1.Query(this);
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
        query = new query_1.Query(this);
        query.group(group_by, fields);
        return query;
    }
    //#
    // Counts records by conditions
    // @param {Object} [condition]
    // @return {Number}
    // @promise
    static count(condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield new query_1.Query(this).where(condition).count());
        });
    }
    //#
    // Updates some fields of records that match conditions
    // @param {Object} updates
    // @param {Object} [condition]
    // @return {Number}
    // @promise
    static update(updates, condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield new query_1.Query(this).where(condition).update(updates));
        });
    }
    //#
    // Deletes records by conditions
    // @param {Object} [condition]
    // @return {Number}
    // @promise
    static delete(condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield new query_1.Query(this).where(condition).delete());
        });
    }
}
exports.ModelQuery = ModelQuery;
