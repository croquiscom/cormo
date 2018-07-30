import { AdapterBase } from './base';
declare class SQLAdapterBase extends AdapterBase {
    protected _contains_op: string;
    protected _regexp_op: string;
    protected _false_value: string;
    protected _escape_ch: string;
    _param_place_holder(pos: any): string;
    _convertValueType(value: any, property_type_class: any): any;
    _buildWhereSingle(property: any, key: any, value: any, params: any): any;
    _buildWhere(schema: any, conditions: any, params: any, conjunction?: string): any;
    _buildGroupExpr(group_expr: any): string;
    _buildGroupFields(group_by: any, group_fields: any): string;
    _buildSelect(model_class: any, select: any): string;
    upsert(model: any, data: any, conditions: any, options: any): Promise<any>;
}
export { SQLAdapterBase };
