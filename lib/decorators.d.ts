import { Connection, IAssociationBelongsToOptions, IAssociationHasManyOptions, IAssociationHasOneOptions } from './connection';
import { BaseModel, IColumnProperty } from './model';
import * as types from './types';
export declare function Model(options?: {
    connection?: Connection;
}): (ctor: typeof BaseModel) => void;
export declare function Column(column_property: IColumnProperty | types.ColumnType): (target: BaseModel, propertyKey: string) => void;
export declare function HasMany(options?: IAssociationHasManyOptions): (target: BaseModel, propertyKey: string) => void;
export declare function HasOne(options?: IAssociationHasOneOptions): (target: BaseModel, propertyKey: string) => void;
export declare function BelongsTo(options?: IAssociationBelongsToOptions): (target: BaseModel, propertyKey: string) => void;
