import * as cormo from 'cormo';
export declare function Model(options?: {
    connection?: cormo.Connection;
    name?: string;
    description?: string;
}): (ctor: typeof cormo.BaseModel) => void;
interface ColumnBasicOptions {
    required?: boolean;
    graphql_required?: boolean;
    unique?: boolean;
    name?: string;
    description?: string;
    default_value?: string | number | (() => string | number);
}
export declare function Column(options: {
    enum: any;
} & ColumnBasicOptions | {
    type: cormo.types.ColumnType | cormo.types.ColumnType[];
} & ColumnBasicOptions): PropertyDecorator;
interface ObjectColumnOptions {
    type: any;
    required?: boolean;
    description?: string;
}
export declare function ObjectColumn(options: ObjectColumnOptions): PropertyDecorator;
interface HasManyBasicOptions {
    type?: string;
    foreign_key?: string;
    integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
    description?: string;
}
export declare function HasMany(options: HasManyBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
interface HasOneBasicOptions {
    type?: string;
    foreign_key?: string;
    integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
    description?: string;
}
export declare function HasOne(options: HasOneBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
interface BelongsToBasicOptions {
    type?: string;
    required?: boolean;
    foreign_key?: string;
    description?: string;
}
export declare function BelongsTo(options: BelongsToBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
export declare function Index(columns: {
    [column: string]: 1 | -1;
}, options?: {
    name?: string;
    unique?: boolean;
}): (ctor: typeof cormo.BaseModel) => void;
export {};
