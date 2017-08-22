interface AdapterSettingsMongoDB {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
}

interface AdapterSettingsMySQL {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
  charset?: string;
  collation?: string;
  pool_size?: number;
}

interface AdapterSettingsPostgreSQL {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
}

interface AdapterSettingsSQLite3 {
  database: string;
}

interface AdapterSettingsSQLite3Memory {
}

export class Connection {
  constructor(adapater_name: 'mongodb', settings: AdapterSettingsMongoDB);
  constructor(adapater_name: 'mysql', settings: AdapterSettingsMySQL);
  constructor(adapater_name: 'postgresql', settings: AdapterSettingsPostgreSQL);
  constructor(adapater_name: 'sqlite3', settings: AdapterSettingsSQLite3);
  constructor(adapater_name: 'sqlite3_memory', settings: AdapterSettingsSQLite3Memory);
  constructor(adapater_name: string, settings: object);
  applySchemas(options?: { verbose?: boolean }): PromiseLike<void>;
  applySchemasSync(options?: { verbose?: boolean }): void;
}

type ModelColumnType = StringConstructor | 'string' | NumberConstructor | 'number'
        | DateConstructor | 'date' | BooleanConstructor | 'boolean'
        | ObjectConstructor | 'object'

interface ModelColumnProperty {
  type: ModelColumnType;
  required?: boolean;
  unique?: boolean;
}

type RecordID = number | string;

export class Model {
  static lean_query: boolean;

  static connection(connection: Connection, name?: string): void;
  static column(path: string, property: ModelColumnType | ModelColumnProperty): void;

  static create<T>(data?: T): PromiseLike<T>;

  static query<T>(): Query<T>;
  static find<T>(id: RecordID | RecordID[]): Query<T|T[]>;
  static findPreserve<T>(id: RecordID[]): Query<T[]>;
  static where<T>(condition?: object): Query<T>;
}

export class Query<T> implements PromiseLike<T> {
  find(id: RecordID | RecordID[]): this;
  findPreserve(id: RecordID[]): this;
  where(condition: object): this;
  select(columns: string): this;
  order(orders: string): this;
  group(group_by: string, fields: object): this;
  one(): this;
  limit(limit: number): this;
  skip(skip: number); this;

  exec(): PromiseLike<T>;
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object): PromiseLike<number>;
  delete(): PromiseLike<number>;
}
