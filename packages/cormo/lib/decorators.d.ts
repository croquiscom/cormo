import { Connection, AssociationBelongsToOptions, AssociationHasManyOptions, AssociationHasOneOptions } from './connection';
import { BaseModel, ColumnNestedProperty, ColumnProperty } from './model';
import * as types from './types';
export declare function Model(options?: {
    connection?: Connection;
    name?: string;
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
