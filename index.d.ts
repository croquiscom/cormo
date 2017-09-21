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

  static create<T, U extends T>(this: { new(): T }, data?: U): PromiseLike<T>;

  static query<T>(this: { new(): T }): QueryArray<T>;
  static find<T>(this: { new(): T }, id: RecordID): QuerySingle<T>;
  static find<T>(this: { new(): T }, id: RecordID[]): QueryArray<T>;
  static findPreserve<T>(this: { new(): T }, id: RecordID[]): QueryArray<T>;
  static where<T>(this: { new(): T }, condition?: object): QueryArray<T>;
}

export interface QuerySingle<T> extends PromiseLike<T> {
  find(id: RecordID): QuerySingle<T>;
  find(id: RecordID[]): QueryArray<T>;
  findPreserve(id: RecordID[]): QueryArray<T>;
  where(condition: object): QuerySingle<T>;
  select(columns: string): QuerySingle<T>;
  order(orders: string): QuerySingle<T>;
  group(group_by: string, fields: object): QuerySingle<T>;
  one(): QuerySingle<T>;
  limit(limit: number): QuerySingle<T>;
  skip(skip: number): QuerySingle<T>;
  if(condition: boolean): QuerySingle<T>;
  endif(): QuerySingle<T>;
  include(column: string, select?: string): QuerySingle<T>;

  exec(): PromiseLike<T>;
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object): PromiseLike<number>;
  delete(): PromiseLike<number>;
}

export interface QueryArray<T> extends PromiseLike<T[]> {
  find(id: RecordID): QuerySingle<T>;
  find(id: RecordID[]): QueryArray<T>;
  findPreserve(id: RecordID[]): QueryArray<T>;
  where(condition: object): QueryArray<T>;
  select(columns: string): QueryArray<T>;
  order(orders: string): QueryArray<T>;
  group(group_by: string, fields: object): QueryArray<T>;
  one(): QuerySingle<T>;
  limit(limit: number): QueryArray<T>;
  skip(skip: number): QueryArray<T>;
  if(condition: boolean): QueryArray<T>;
  endif(): QueryArray<T>;
  include(column: string, select?: string): QueryArray<T>;

  exec(): PromiseLike<T[]>;
  then<TResult1 = T[], TResult2 = never>(onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object): PromiseLike<number>;
  delete(): PromiseLike<number>;
}

export const types: CormoTypes
