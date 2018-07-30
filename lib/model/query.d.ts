/**
 * Model query
 * @namespace model
 */
declare class ModelQuery {
    static _createQueryAndRun(criteria: any, data: any): any;
    static _createOptionalQueryAndRun(criteria: any, data: any): any;
    static query(): any;
    static find(id: any): any;
    static findPreserve(ids: any): any;
    static where(condition: any): any;
    static select(columns: any): any;
    static order(orders: any): any;
    static group(group_by: any, fields: any): any;
    static count(condition: any): Promise<any>;
    static update(updates: any, condition: any): Promise<any>;
    static delete(condition: any): Promise<any>;
}
export { ModelQuery };
