import * as inflector from '../util/inflector';

/**
 * Manipulate data
 * @namespace connection
 */
class ConnectionManipulate {
  private async _manipulateCreate(model, data) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    model = this.models[model];
    return (await model.create(data, {
      skip_log: true
    }));
  }

  private async _manipulateDelete(model, data) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    model = this.models[model];
    await model.where(data).delete({
      skip_log: true
    });
  }

  private async _manipulateDeleteAllModels() {
    var i, len, model, ref;
    ref = Object.keys(this.models);
    for (i = 0, len = ref.length; i < len; i++) {
      model = ref[i];
      if (model === '_Archive') {
        return;
      }
      model = this.models[model];
      await model.where().delete({
        skip_log: true
      });
    }
  }

  private async _manipulateDropModel(model) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    model = this.models[model];
    await model.drop();
  }

  private async _manipulateDropAllModels() {
    await this.dropAllModels();
  }

  private async _manipulateFind(model, data) {
    model = inflector.camelize(inflector.singularize(model));
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    model = this.models[model];
    return (await model.where(data).exec({
      skip_log: true
    }));
  }

  private _manipulateConvertIds(id_to_record_map, model, data) {
    var column, property, record, ref;
    model = inflector.camelize(model);
    if (!this.models[model]) {
      return;
    }
    model = this.models[model];
    ref = model._schema;
    for (column in ref) {
      property = ref[column];
      if (property.record_id && data.hasOwnProperty(column)) {
        if (property.array && Array.isArray(data[column])) {
          data[column] = data[column].map(function(value) {
            var record;
            record = id_to_record_map[value];
            if (record) {
              return record.id;
            } else {
              return value;
            }
          });
        } else {
          record = id_to_record_map[data[column]];
          if (record) {
            data[column] = record.id;
          }
        }
      }
    }
  }

  //#
  // Manipulate data
  // @param {Array<Object>} commands
  // @return {Object}
  // @promise
  async manipulate(commands) {
    var command, data, i, id, id_to_record_map, key, len, model, record, records;
    this.log('<conn>', 'manipulate', commands);
    await this._checkSchemaApplied();
    id_to_record_map = {};
    if (!Array.isArray(commands)) {
      commands = [commands];
    }
    for (i = 0, len = commands.length; i < len; i++) {
      command = commands[i];
      if (typeof command === 'object') {
        key = Object.keys(command);
        if (key.length === 1) {
          key = key[0];
          data = command[key];
        } else {
          key = void 0;
        }
      } else if (typeof command === 'string') {
        key = command;
      }
      if (!key) {
        throw new Error('invalid command: ' + JSON.stringify(command));
      } else if (key.substr(0, 7) === 'create_') {
        model = key.substr(7);
        id = data.id;
        delete data.id;
        this._manipulateConvertIds(id_to_record_map, model, data);
        record = (await this._manipulateCreate(model, data));
        if (id) {
          id_to_record_map[id] = record;
        }
      } else if (key.substr(0, 7) === 'delete_') {
        model = key.substr(7);
        await this._manipulateDelete(model, data);
      } else if (key === 'deleteAll') {
        await this._manipulateDeleteAllModels();
      } else if (key.substr(0, 5) === 'drop_') {
        model = key.substr(5);
        await this._manipulateDropModel(model);
      } else if (key === 'dropAll') {
        await this._manipulateDropAllModels();
      } else if (key.substr(0, 5) === 'find_') {
        model = key.substr(5);
        id = data.id;
        delete data.id;
        if (!id) {
          continue;
        }
        records = (await this._manipulateFind(model, data));
        id_to_record_map[id] = records;
      } else {
        throw new Error('unknown command: ' + key);
      }
    }
    return id_to_record_map;
  }
}

export { ConnectionManipulate };
