"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Model callbacks
 * @namespace model
 */
class ModelCallback {
    /**
     * Adds a callback of after initializing
     * @param {Function|String} method
     */
    static afterInitialize(method) {
        return this.addCallback('after', 'initialize', method);
    }
    /**
     * Adds a callback of after finding
     * @param {Function|String} method
     */
    static afterFind(method) {
        return this.addCallback('after', 'find', method);
    }
    /**
     * Adds a callback of before saving
     * @param {Function|String} method
     */
    static beforeSave(method) {
        return this.addCallback('before', 'save', method);
    }
    /**
     * Adds a callback of after saving
     * @param {Function|String} method
     */
    static afterSave(method) {
        return this.addCallback('after', 'save', method);
    }
    /**
     * Adds a callback of before creating
     * @param {Function|String} method
     */
    static beforeCreate(method) {
        return this.addCallback('before', 'create', method);
    }
    /**
     * Adds a callback of after creating
     * @param {Function|String} method
     */
    static afterCreate(method) {
        return this.addCallback('after', 'create', method);
    }
    /**
     * Adds a callback of before updating
     * @param {Function|String} method
     */
    static beforeUpdate(method) {
        return this.addCallback('before', 'update', method);
    }
    /**
     * Adds a callback of after updating
     * @param {Function|String} method
     */
    static afterUpdate(method) {
        return this.addCallback('after', 'update', method);
    }
    /**
     * Adds a callback of before destroying
     * @param {Function|String} method
     */
    static beforeDestroy(method) {
        return this.addCallback('before', 'destroy', method);
    }
    /**
     * Adds a callback of after destroying
     * @param {Function|String} method
     */
    static afterDestroy(method) {
        return this.addCallback('after', 'destroy', method);
    }
    /**
     * Adds a callback of before validating
     * @param {Function|String} method
     */
    static beforeValidate(method) {
        return this.addCallback('before', 'validate', method);
    }
    /**
     * Adds a callback of after validating
     * @param {Function|String} method
     */
    static afterValidate(method) {
        return this.addCallback('after', 'validate', method);
    }
    /**
     * Adds a callback
     * @param {String} type
     * @param {String} name
     * @param {Function|String} method
     */
    static addCallback(type, name, method) {
        this._checkConnection();
        if (!(type === 'before' || type === 'after') || !name) {
            return;
        }
        const callbacks_map = this._callbacks_map || (this._callbacks_map = {});
        const callbacks = callbacks_map[name] || (callbacks_map[name] = []);
        return callbacks.push({ type, method });
    }
    _runCallbacks(name, type) {
        let callbacks = this.constructor._callbacks_map && this.constructor._callbacks_map[name];
        if (!callbacks) {
            return;
        }
        callbacks = callbacks.filter((callback) => callback.type === type);
        for (const callback of callbacks) {
            let method = callback.method;
            if (typeof method === 'string') {
                if (!this[method]) {
                    throw new Error(`The method '${method}' doesn't exist`);
                }
                method = this[method];
            }
            if (typeof method !== 'function') {
                throw new Error('Cannot execute method');
            }
            method.call(this);
        }
    }
}
exports.ModelCallback = ModelCallback;
