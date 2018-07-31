import * as _ from 'lodash';
import * as util from '../util';
import * as inflector from '../util/inflector';

import { Model } from './index';

/**
 * Model persistence
 * @namespace model
 */
class ModelPersistence {
  /**
   * Creates a record and saves it to the database
   * 'Model.create(data)' is the same as 'Model.build(data).save()'
   */
  public static async create<T extends Model, U extends T>(
    this: typeof Model, data?: U, options?: { skip_log: boolean },
  ): Promise<T> {
    await this._checkReady();
    return await this.build<T, U>(data).save(options);
  }

  /**
   * Creates multiple records and saves them to the database.
   */
  public static async createBulk<T extends Model, U extends T>(this: typeof Model, data?: U[]): Promise<T[]> {
    await this._checkReady();
    if (!Array.isArray(data)) {
      throw new Error('data is not an array');
    }
    if (data.length === 0) {
      return [];
    }
    const records = data.map((item) => {
      return this.build<T, U>(item);
    });
    await Promise.all(records.map((record) => record.validate()));
    for (const record of records) {
      record._runCallbacks('save', 'before');
    }
    for (const record of records) {
      record._runCallbacks('create', 'before');
    }
    try {
      return await this._createBulk(records);
    } finally {
      for (const record of records) {
        record._runCallbacks('create', 'after');
      }
      for (const record of records) {
        record._runCallbacks('save', 'after');
      }
    }
  }

  private static _buildSaveDataColumn(data, model, column, property, allow_null) {
    var adapter, parts, value;
    adapter = this._adapter;
    parts = property._parts;
    value = util.getPropertyOfPath(model, parts);
    value = adapter.valueToDB(value, column, property);
    if (allow_null || value !== void 0) {
      if (adapter.support_nested) {
        util.setPropertyOfPath(data, parts, value);
      } else {
        data[property._dbname] = value;
      }
    }
  }

  private static async _createBulk(records) {
    var data_array, error, ids;
    error = void 0;
    data_array = records.map(function(record) {
      var data, e;
      try {
        data = record._buildSaveData();
      } catch (error1) {
        e = error1;
        error = e;
      }
      return data;
    });
    if (error) {
      throw error;
    }
    this._connection.log(this._name, 'createBulk', data_array);
    ids = (await this._adapter.createBulk(this._name, data_array));
    records.forEach(function(record, i) {
      return Object.defineProperty(record, 'id', {
        configurable: false,
        enumerable: true,
        writable: false,
        value: ids[i]
      });
    });
    return records;
  }

  /**
   * Saves data to the database
   * @param {Object} [options]
   * @param {Boolean} [options.validate=true]
   * @param {Boolean} [options.skip_log=false]
   * @return {Model} this
   * @promise
   */
  public async save(
    this: Model & { constructor: typeof Model },
    options: { skip_log?: boolean, validate?: boolean } = {},
  ): Promise<Model & { constructor: typeof Model }> {
    await this.constructor._checkReady();
    if (options.validate !== false) {
      await this.validate();
      return await this.save({ ...options, validate: false });
    }
    this._runCallbacks('save', 'before');
    if (this.id) {
      this._runCallbacks('update', 'before');
      try {
        await this._update(options);
      } finally {
        this._runCallbacks('update', 'after');
        this._runCallbacks('save', 'after');
      }
    } else {
      this._runCallbacks('create', 'before');
      try {
        await this._create(options);
      } finally {
        this._runCallbacks('create', 'after');
        this._runCallbacks('save', 'after');
      }
    }
    return this;
  }

  private _buildSaveData() {
    var column, ctor, data, property, schema;
    data = {};
    ctor = this.constructor;
    schema = ctor._schema;
    for (column in schema) {
      property = schema[column];
      ctor._buildSaveDataColumn(data, this, column, property);
    }
    if (this.id != null) {
      data.id = ctor._adapter.idToDB(this.id);
    }
    return data;
  }

  private async _create(options) {
    const data = this._buildSaveData();
    const ctor = this.constructor;
    if (!(options != null ? options.skip_log : void 0)) {
      ctor._connection.log(ctor._name, 'create', data);
    }
    const id = await ctor._adapter.create(ctor._name, data);
    Object.defineProperty(this, 'id', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: id,
    });
    // save sub objects of each association
    const foreign_key = inflector.foreign_key(ctor._name);
    const promises = Object.keys(ctor._associations).map(async (column) => {
      var sub_promises;
      sub_promises = (this['__cache_' + column] || []).map(function(sub) {
        sub[foreign_key] = id;
        return sub.save();
      });
      return (await Promise.all(sub_promises));
    });
    try {
      await Promise.all(promises);
    } catch (error) {
    }
    return this._prev_attributes = {};
  }

  private async _update(options) {
    const ctor = this.constructor;
    if (ctor.dirty_tracking) {
      // update changed values only
      if (!this.isDirty()) {
        return;
      }
      const data = {};
      const adapter = ctor._adapter;
      const schema = ctor._schema;
      for (const path in this._prev_attributes) {
        ctor._buildSaveDataColumn(data, this._attributes, path, schema[path], true);
      }
      if (!(options != null ? options.skip_log : void 0)) {
        ctor._connection.log(ctor._name, 'update', data);
      }
      await adapter.updatePartial(ctor._name, data, {
        id: this.id
      }, {});
      return this._prev_attributes = {};
    } else {
      // update all
      const data = this._buildSaveData();
      if (!(options != null ? options.skip_log : void 0)) {
        ctor._connection.log(ctor._name, 'update', data);
      }
      await ctor._adapter.update(ctor._name, data);
      return this._prev_attributes = {};
    }
  }
}

export { ModelPersistence };
