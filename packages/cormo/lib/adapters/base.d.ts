import { Transaction } from '../transaction';
export interface ISchemas {
    tables: {
        [table_name: string]: any;
    };
    indexes?: {
        [table_name: string]: any;
    };
    foreign_keys?: {
        [table_name: string]: any;
    };
}
export interface IAdapterFindOptions {
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
export interface IAdapterCountOptions {
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
}
export { AdapterBase };
