import { Model } from './index';
export declare type ModelCallbackName = 'create' | 'destroy' | 'find' | 'initialize' | 'save' | 'update' | 'validate';
export declare type ModelCallbackType = 'after' | 'before';
export declare type ModelCallbackMethod = () => void | 'string';
/**
 * Model callbacks
 * @namespace model
 */
declare class ModelCallback {
    /**
     * Adds a callback of after initializing
     * @param {Function|String} method
     */
    static afterInitialize(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after finding
     * @param {Function|String} method
     */
    static afterFind(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of before saving
     * @param {Function|String} method
     */
    static beforeSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after saving
     * @param {Function|String} method
     */
    static afterSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of before creating
     * @param {Function|String} method
     */
    static beforeCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after creating
     * @param {Function|String} method
     */
    static afterCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of before updating
     * @param {Function|String} method
     */
    static beforeUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after updating
     * @param {Function|String} method
     */
    static afterUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of before destroying
     * @param {Function|String} method
     */
    static beforeDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after destroying
     * @param {Function|String} method
     */
    static afterDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of before validating
     * @param {Function|String} method
     */
    static beforeValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    /**
     * Adds a callback of after validating
     * @param {Function|String} method
     */
    static afterValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): number | undefined;
    private static _callbacks_map;
    /**
     * Adds a callback
     * @param {String} type
     * @param {String} name
     * @param {Function|String} method
     */
    private static addCallback;
    _runCallbacks(this: {
        constructor: typeof ModelCallback;
    }, name: ModelCallbackName, type: ModelCallbackType): void;
}
export { ModelCallback };
