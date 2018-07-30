/// <reference types="node" />
import * as stream from 'stream';
/**
 * Collects conditions to query
 */
declare class Query {
    constructor(model: any);
    find(id: any): this;
    findPreserve(ids: any): this;
    near(target: any): this;
    _addCondition(condition: any): any;
    where(condition: any): this;
    select(columns: any): this;
    order(orders: any): this;
    group(group_by: any, fields: any): this;
    one(): this;
    limit(limit: any): this;
    skip(skip: any): this;
    lean(lean?: boolean): this;
    if(condition: any): this;
    endif(): this;
    cache(options: any): this;
    include(column: any, select: any): this;
    _exec(options: any): Promise<any>;
    _execAndInclude(options: any): Promise<any>;
    exec(options: any): Promise<any>;
    stream(): stream.Transform;
    explain(): Promise<any>;
    then(fulfilled: any, rejected: any): any;
    count(): Promise<any>;
    _validateAndBuildSaveData(errors: any, data: any, updates: any, path: any, object: any): void;
    update(updates: any): Promise<any>;
    upsert(updates: any): Promise<any>;
    _doIntegrityActions(integrities: any, ids: any): Promise<[{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]>;
    _doArchiveAndIntegrity(options: any): Promise<void>;
    delete(options: any): Promise<any>;
}
export { Query };
