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

type ManipulateCommand = string | object;

export class Connection {
  constructor(adapater_name: 'mongodb', settings: AdapterSettingsMongoDB);
  constructor(adapater_name: 'mysql', settings: AdapterSettingsMySQL);
  constructor(adapater_name: 'postgresql', settings: AdapterSettingsPostgreSQL);
  constructor(adapater_name: 'sqlite3', settings: AdapterSettingsSQLite3);
  constructor(adapater_name: 'sqlite3_memory', settings: AdapterSettingsSQLite3Memory);
  constructor(adapater_name: string, settings: object);
  applySchemas(options?: { verbose?: boolean }): PromiseLike<void>;
  applySchemasSync(options?: { verbose?: boolean }): void;
  dropAllModels(): PromiseLike<void>;
  manipulate(commands: ManipulateCommand[]): PromiseLike<{[id: string]: any}>;
}

interface CormoTypesString {
  (length: number | undefined): CormoTypesString
}

interface CormoTypesNumber {
}

interface CormoTypesBoolean {
}

interface CormoTypesInteger {
}

interface CormoTypesGeoPoint {
}

interface CormoTypesDate {
}

interface CormoTypesObject {
}

interface CormoTypesRecordID {
}

interface CormoTypesText {
}

interface CormoTypes {
  String: CormoTypesString;
  Number: CormoTypesNumber;
  Boolean: CormoTypesBoolean;
  Integer: CormoTypesInteger;
  GeoPoint: CormoTypesGeoPoint;
  Date: CormoTypesDate;
  Object: CormoTypesObject;
  RecordID: CormoTypesRecordID;
  Text: CormoTypesText;
}

type ModelColumnType = StringConstructor | 'string' | CormoTypesString
        | NumberConstructor | 'number' | CormoTypesNumber
        | BooleanConstructor | 'boolean' | CormoTypesBoolean
        | 'integer' | CormoTypesInteger | 'geopoint' | CormoTypesGeoPoint
        | DateConstructor | 'date' | CormoTypesDate
        | ObjectConstructor | 'object' | CormoTypesObject
        | 'recordid' | CormoTypesRecordID | 'text' | CormoTypesText

interface ModelColumnProperty {
  type: ModelColumnType;
  required?: boolean;
  unique?: boolean;
}

type RecordID = number | string;

type Integrity = 'ignore' | 'nullify' | 'restrict' | 'delete'

export class Model {
  static lean_query: boolean;

  static connection(connection: Connection, name?: string): void;
  static column(path: string, property: ModelColumnType | ModelColumnProperty): void;
  static index(columns: {[column: string]: 1 | -1}, options?: { name?: string, unique?: boolean})
  static drop(): PromiseLike<void>;
  static deleteAll(): PromiseLike<void>;

  static hasMany(target_model_or_column: string, options?: { type?: string, as?: string, foreign_key?: string, integrity?: Integrity})
  static hasOne(target_model_or_column: string, options?: { type?: string, as?: string, foreign_key?: string, integrity?: Integrity})
  static belongsTo(target_model_or_column: string, options?: { type?: string, as?: string, foreign_key?: string, required?: boolean})

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

export const types: CormoTypes
