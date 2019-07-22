import * as cormo from 'cormo';
export declare function Model(options?: {
    connection?: cormo.Connection;
    name?: string;
    description?: string;
}): (ctor: typeof cormo.BaseModel) => void;
interface IColumnBasicOptions {
    required?: boolean;
    graphql_required?: boolean;
    unique?: boolean;
    name?: string;
    description?: string;
    default_value?: string | number | (() => string | number);
}
export declare function Column(options: {
    enum: any;
} & IColumnBasicOptions | {
    type: cormo.types.ColumnType | cormo.types.ColumnType[];
} & IColumnBasicOptions): PropertyDecorator;
interface IObjectColumnOptions {
    type: any;
    required?: boolean;
    description?: string;
}
export declare function ObjectColumn(options: IObjectColumnOptions): PropertyDecorator;
interface IHasManyBasicOptions {
    type?: string;
    foreign_key?: string;
    integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
    description?: string;
}
export declare function HasMany(options: IHasManyBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
interface IHasOneBasicOptions {
    type?: string;
    foreign_key?: string;
    integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
    description?: string;
}
export declare function HasOne(options: IHasOneBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
interface IBelongsToBasicOptions {
    type?: string;
    required?: boolean;
    foreign_key?: string;
    description?: string;
}
export declare function BelongsTo(options: IBelongsToBasicOptions): (target: cormo.BaseModel, propertyKey: string) => void;
export declare function Index(columns: {
    [column: string]: 1 | -1;
}, options?: {
    name?: string;
    unique?: boolean;
}): (ctor: typeof cormo.BaseModel) => void;
export {};
