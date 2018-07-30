import { Model } from './index';

export type ModelCallbackName = 'create' | 'destroy' | 'find' | 'initialize' | 'save' | 'update' | 'validate';
export type ModelCallbackType = 'after' | 'before';
export type ModelCallbackMethod = () => void | 'string';

/**
 * Model callbacks
 * @namespace model
 */
class ModelCallback {
  /**
   * Adds a callback of after initializing
   * @param {Function|String} method
   */
  public static afterInitialize(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'initialize', method);
  }

  /**
   * Adds a callback of after finding
   * @param {Function|String} method
   */
  public static afterFind(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'find', method);
  }

  /**
   * Adds a callback of before saving
   * @param {Function|String} method
   */
  public static beforeSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('before', 'save', method);
  }

  /**
   * Adds a callback of after saving
   * @param {Function|String} method
   */
  public static afterSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'save', method);
  }

  /**
   * Adds a callback of before creating
   * @param {Function|String} method
   */
  public static beforeCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('before', 'create', method);
  }

  /**
   * Adds a callback of after creating
   * @param {Function|String} method
   */
  public static afterCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'create', method);
  }

  /**
   * Adds a callback of before updating
   * @param {Function|String} method
   */
  public static beforeUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('before', 'update', method);
  }

  /**
   * Adds a callback of after updating
   * @param {Function|String} method
   */
  public static afterUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'update', method);
  }

  /**
   * Adds a callback of before destroying
   * @param {Function|String} method
   */
  public static beforeDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('before', 'destroy', method);
  }

  /**
   * Adds a callback of after destroying
   * @param {Function|String} method
   */
  public static afterDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'destroy', method);
  }

  /**
   * Adds a callback of before validating
   * @param {Function|String} method
   */
  public static beforeValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('before', 'validate', method);
  }

  /**
   * Adds a callback of after validating
   * @param {Function|String} method
   */
  public static afterValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod) {
    return this.addCallback('after', 'validate', method);
  }

  private static _callbacks_map: {
    [key in ModelCallbackName]?: Array<{
      type: ModelCallbackType,
      method: ModelCallbackMethod,
    }>;
  };

  /**
   * Adds a callback
   * @param {String} type
   * @param {String} name
   * @param {Function|String} method
   */
  private static addCallback(this: typeof Model & typeof ModelCallback,
    type: ModelCallbackType, name: ModelCallbackName, method: ModelCallbackMethod) {
    this._checkConnection();
    if (!(type === 'before' || type === 'after') || !name) {
      return;
    }
    const callbacks_map = this._callbacks_map || (this._callbacks_map = {});
    const callbacks = callbacks_map[name] || (callbacks_map[name] = []);
    return callbacks.push({ type, method });
  }

  public _runCallbacks(this: { constructor: typeof ModelCallback }, name: ModelCallbackName, type: ModelCallbackType) {
    let callbacks = this.constructor._callbacks_map && this.constructor._callbacks_map[name];
    if (!callbacks) {
      return;
    }
    callbacks = callbacks.filter((callback) => callback.type === type);
    for (const callback of callbacks) {
      let method = callback.method;
      if (typeof method === 'string') {
        if (!(this as any)[method]) {
          throw new Error(`The method '${method}' doesn't exist`);
        }
        method = (this as any)[method];
      }
      if (typeof method !== 'function') {
        throw new Error('Cannot execute method');
      }
      method.call(this);
    }
  }
}

export { ModelCallback };
