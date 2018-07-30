/**
 * Model validate
 * @namespace model
 */
declare class ModelValidate {
    static _validateType(column: any, type_class: any, value: any): any;
    static _validateColumn(data: any, column: any, property: any, for_update: any): void;
    validate(): void;
    static addValidator(validator: any): void;
}
export { ModelValidate };
