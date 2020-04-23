import { ColumnPropertyInternal } from '../model';
import { Transaction } from '../transaction';
import * as types from '../types';
export interface SchemasColumn {
    required: boolean;
    type: types.ColumnType | undefined;
    adapter_type_string?: string;
}
export interface SchemasTable {
    [column_name: string]: SchemasColumn;
}
export interface SchemasIndex {
    [index_name: string]: any;
}
export interface Schemas {
    tables: {
        [table_name: string]: SchemasTable | 'NO SCHEMA';
    };
    indexes?: {
        [table_name: string]: SchemasIndex;
    };
    foreign_keys?: {
        [table_name: string]: any;
    };
}
export interface AdapterFindOptions {
    lean: boolean;
    orders: any[];
    near?: any;
    select?: string[];
    select_raw?: string[];
    conditions_of_group: any[];
    group_fields?: any;
    group_by?: string[];
    limit?: number;
    skip?: number;
    explain?: boolean;
    transaction?: Transaction;
    node?: 'master' | 'read';
    index_hint?: string;
}
export interface AdapterCountOptions {
    conditions_of_group: any[];
    group_fields?: any;
    group_by?: string[];
    transaction?: Transaction;
    node?: 'master' | 'read';
    index_hint?: string;
}
/**
 * Base class for adapters
 * @namespace adapter
 */
declare abstract class AdapterBase {
    getAdapterTypeString(column_property: ColumnPropertyInternal): string | undefined;
}
export { AdapterBase };
