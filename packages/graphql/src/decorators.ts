import * as cormo from 'cormo';

export function Model(options: { connection?: cormo.Connection; name?: string; description?: string } = {}) {
  const c = cormo.Model({ connection: options.connection, name: options.name, description: options.description });
  return (ctor: typeof cormo.BaseModel) => {
    c(ctor);
  };
}

interface ColumnBasicOptions {
  required?: boolean;
  graphql_required?: boolean;
  unique?: boolean;
  name?: string;
  description?: string;
  default_value?: string | number | (() => string | number);
}

export function Column(
  options:
    | ({ enum: any } & ColumnBasicOptions)
    | ({ type: cormo.types.ColumnType | cormo.types.ColumnType[] } & ColumnBasicOptions),
): PropertyDecorator;
export function Column(
  options: {
    enum?: any;
    type?: cormo.types.ColumnType | cormo.types.ColumnType[];
  } & ColumnBasicOptions,
): PropertyDecorator {
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
    description: options.description,
    unique: options.unique,
  });
  return (target: object, propertyKey: string | symbol) => {
    c(target, propertyKey);
  };
}

interface ObjectColumnOptions {
  type: any;
  required?: boolean;
  description?: string;
}

export function ObjectColumn(options: ObjectColumnOptions): PropertyDecorator {
  const c = cormo.ObjectColumn(options.type);
  return (target: object, propertyKey: string | symbol) => {
    c(target, propertyKey);
  };
}

interface HasManyBasicOptions {
  type?: string;
  foreign_key?: string;
  integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
  description?: string;
}

export function HasMany(options: HasManyBasicOptions) {
  const c_options = {
    foreign_key: options.foreign_key,
    integrity: options.integrity,
    type: options.type,
  };
  const c = cormo.HasMany(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

interface HasOneBasicOptions {
  type?: string;
  foreign_key?: string;
  integrity?: 'ignore' | 'nullify' | 'restrict' | 'delete';
  description?: string;
}

export function HasOne(options: HasOneBasicOptions) {
  const c_options = {
    foreign_key: options.foreign_key,
    integrity: options.integrity,
    type: options.type,
  };
  const c = cormo.HasOne(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

interface BelongsToBasicOptions {
  type?: string;
  required?: boolean;
  foreign_key?: string;
  description?: string;
}

export function BelongsTo(options: BelongsToBasicOptions) {
  const c_options = {
    foreign_key: options.foreign_key,
    required: options.required,
    type: options.type,
  };
  const c = cormo.BelongsTo(c_options);
  return (target: cormo.BaseModel, propertyKey: string) => {
    c(target, propertyKey);
  };
}

export function Index(columns: { [column: string]: 1 | -1 }, options?: { name?: string; unique?: boolean }) {
  const c = cormo.Index(columns, options);
  return (ctor: typeof cormo.BaseModel) => {
    c(ctor);
  };
}
