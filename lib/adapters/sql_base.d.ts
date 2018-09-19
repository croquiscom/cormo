import { AdapterBase } from './base';
declare abstract class SQLAdapterBase extends AdapterBase {
    protected _contains_op: string;
    protected _regexp_op: string | null;
    protected _false_value: string;
    protected _escape_ch: string;
    upsert(model: any, data: any, conditions: any, options: any): Promise<any>;
    protected _param_place_holder(pos: any): string;
    protected _convertValueType(value: any, property_type_class: any): any;
    protected _buildWhereSingle(property: any, key: any, value: any, params: any): any;
    protected _buildWhere(schema: any, conditions: any, params: any, conjunction?: string): any;
    protected _buildGroupExpr(group_expr: any): string;
    protected _buildGroupFields(group_by: any, group_fields: any): string;
    protected _buildSelect(model_class: any, select: any): string;
}
export { SQLAdapterBase };
