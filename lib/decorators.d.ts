import { Connection, IAssociationBelongsToOptions, IAssociationHasManyOptions, IAssociationHasOneOptions } from './connection';
import { BaseModel, IColumnNestedProperty, IColumnProperty } from './model';
import * as types from './types';
export declare function Model(options?: {
    connection?: Connection;
    name?: string;
}): (ctor: typeof BaseModel) => void;
export declare function Column(column_property: types.ColumnType | types.ColumnType[] | IColumnProperty | IColumnNestedProperty): PropertyDecorator;
export declare function ObjectColumn(partial_model_class: any): PropertyDecorator;
export declare function HasMany(options?: IAssociationHasManyOptions): (target: BaseModel, propertyKey: string) => void;
export declare function HasOne(options?: IAssociationHasOneOptions): (target: BaseModel, propertyKey: string) => void;
export declare function BelongsTo(options?: IAssociationBelongsToOptions): (target: BaseModel, propertyKey: string) => void;
export declare function Index(columns: {
    [column: string]: 1 | -1;
}, options?: {
    name?: string;
    unique?: boolean;
}): (ctor: typeof BaseModel) => void;
