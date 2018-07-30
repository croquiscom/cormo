import { Query } from '../query';
/**
 * Model query
 * @namespace model
 */
declare class ModelQuery {
    static _createQueryAndRun(criteria: any, data: any): Query;
    static _createOptionalQueryAndRun(criteria: any, data: any): Query;
    static query(): Query;
    static find(id: any): Query;
    static findPreserve(ids: any): Query;
    static where(condition: any): Query;
    static select(columns: any): Query;
    static order(orders: any): Query;
    static group(group_by: any, fields: any): Query;
    static count(condition: any): Promise<any>;
    static update(updates: any, condition: any): Promise<any>;
    static delete(condition: any): Promise<any>;
}
export { ModelQuery };
