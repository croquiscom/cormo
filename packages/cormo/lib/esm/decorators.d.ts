import { Connection, AssociationBelongsToOptions, AssociationHasManyOptions, AssociationHasOneOptions } from './connection/index.js';
import { BaseModel, ColumnNestedProperty, ColumnProperty } from './model/index.js';
import * as types from './types.js';
export declare function Model(options?: {
    connection?: Connection;
    name?: string;
    description?: string;
    query_record_id_as_string?: boolean;
}): (ctor: typeof BaseModel) => void;
export declare function Column(column_property: types.ColumnType | types.ColumnType[] | ColumnProperty | ColumnNestedProperty): PropertyDecorator;
export declare function ObjectColumn(partial_model_class: any): PropertyDecorator;
export declare function HasMany(options?: AssociationHasManyOptions): (target: BaseModel, propertyKey: string) => void;
export declare function HasOne(options?: AssociationHasOneOptions): (target: BaseModel, propertyKey: string) => void;
export declare function BelongsTo(options?: AssociationBelongsToOptions): (target: BaseModel, propertyKey: string) => void;
export declare function Index(columns: {
    [column: string]: 1 | -1;
}, options?: {
    name?: string;
    unique?: boolean;
}): (ctor: typeof BaseModel) => void;
