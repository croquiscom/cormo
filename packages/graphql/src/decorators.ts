import * as cormo from 'cormo';

export function Model(options: { connection?: cormo.Connection, name?: string, description?: string } = {}) {
  const c = cormo.Model({ connection: options.connection, name: options.name });
  return (ctor: typeof cormo.BaseModel) => {
    c(ctor);
    (ctor as any)._graphql = {
      description: options.description,
    };
  };
}

interface IColumnBasicOptions {
  required?: boolean;
  graphql_required?: boolean;
  unique?: boolean;
  name?: string;
  description?: string;
  default_value?: string | number | (() => string | number);
}

export function Column(options: { enum: any } & IColumnBasicOptions
  | { type: cormo.types.ColumnType | cormo.types.ColumnType[] } & IColumnBasicOptions): PropertyDecorator;
export function Column(options: {
  enum?: any, type?: cormo.types.ColumnType
  | cormo.types.ColumnType[],
} & IColumnBasicOptions): PropertyDecorator {
  let cormo_type: cormo.types.ColumnType | cormo.types.ColumnType[];
  if (options.enum) {
    cormo_type = cormo.types.Integer;
  } else {
    cormo_type = options.type!;
  }
  const c = cormo.Column({
    default_value: options.default_value,
    name: options.name,
    required: options.required,
    type: cormo_type,
    unique: options.unique,
  });
  return (target: object, propertyKey: string | symbol) => {
    c(target, propertyKey);
  };
}

interface IObjectColumnOptions {
  type: any;
  required?: boolean;
  description?: string;
}

export function ObjectColumn(options: IObjectColumnOptions): PropertyDecorator {
  const c = cormo.ObjectColumn(options.type);
  return (target: object, propertyKey: string | symbol) => {
    c(target, propertyKey);
  };
}

interface IHasManyBasicOptions {
  type: typeof cormo.BaseModel;
  foreign_key?: string;
  integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
  description?: string;
}

export function HasMany(options: IHasManyBasicOptions) {
  const cormo_type = options.type;
  const c_options = {
    foreign_key: options.foreign_key,
    integrity: options.integrity,
    type: cormo_type.name,
  };
  const c = cormo.HasMany(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

interface IHasOneBasicOptions {
  type: typeof cormo.BaseModel;
  foreign_key?: string;
  integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
  description?: string;
}

export function HasOne(options: IHasOneBasicOptions) {
  const cormo_type = options.type;
  const c_options = {
    foreign_key: options.foreign_key,
    integrity: options.integrity,
    type: cormo_type.name,
  };
  const c = cormo.HasOne(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

interface IBelongsToBasicOptions {
  type: typeof cormo.BaseModel;
  required?: boolean;
  foreign_key?: string;
  description?: string;
}

export function BelongsTo(options: IBelongsToBasicOptions) {
  const c_options = {
    foreign_key: options.foreign_key,
    required: options.required,
  };
  const c = cormo.BelongsTo(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

export function Index(columns: { [column: string]: 1 | -1 }, options?: { name?: string, unique?: boolean }) {
  const c = cormo.Index(columns, options);
  return (ctor: typeof cormo.BaseModel) => {
    c(ctor);
  };
}
