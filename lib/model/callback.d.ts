/**
 * Model callbacks
 * @namespace model
 */
declare class ModelCallback {
    static afterInitialize(method: any): any;
    static afterFind(method: any): any;
    static beforeSave(method: any): any;
    static afterSave(method: any): any;
    static beforeCreate(method: any): any;
    static afterCreate(method: any): any;
    static beforeUpdate(method: any): any;
    static afterUpdate(method: any): any;
    static beforeDestroy(method: any): any;
    static afterDestroy(method: any): any;
    static beforeValidate(method: any): any;
    static afterValidate(method: any): any;
    static addCallback(type: any, name: any, method: any): any;
    _runCallbacks(name: any, type: any): any;
}
export { ModelCallback };
