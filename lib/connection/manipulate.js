"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const inflector = require("../util/inflector");
/**
 * Manipulate data
 * @namespace connection
 */
class ConnectionManipulate {
    _manipulateCreate(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            model = this.models[model];
            return (yield model.create(data, {
                skip_log: true
            }));
        });
    }
    _manipulateDelete(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            model = this.models[model];
            yield model.where(data).delete({
                skip_log: true
            });
        });
    }
    _manipulateDeleteAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            var i, len, model, ref;
            ref = Object.keys(this.models);
            for (i = 0, len = ref.length; i < len; i++) {
                model = ref[i];
                if (model === '_Archive') {
                    return;
                }
                model = this.models[model];
                yield model.where().delete({
                    skip_log: true
                });
            }
        });
    }
    _manipulateDropModel(model) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            model = this.models[model];
            yield model.drop();
        });
    }
    _manipulateDropAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dropAllModels();
        });
    }
    _manipulateFind(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(inflector.singularize(model));
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            model = this.models[model];
            return (yield model.where(data).exec({
                skip_log: true
            }));
        });
    }
    _manipulateConvertIds(id_to_record_map, model, data) {
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
                    data[column] = data[column].map(function (value) {
                        var record;
                        record = id_to_record_map[value];
                        if (record) {
                            return record.id;
                        }
                        else {
                            return value;
                        }
                    });
                }
                else {
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
    manipulate(commands) {
        return __awaiter(this, void 0, void 0, function* () {
            var command, data, i, id, id_to_record_map, key, len, model, record, records;
            this.log('<conn>', 'manipulate', commands);
            yield this._checkSchemaApplied();
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
                    }
                    else {
                        key = void 0;
                    }
                }
                else if (typeof command === 'string') {
                    key = command;
                }
                if (!key) {
                    throw new Error('invalid command: ' + JSON.stringify(command));
                }
                else if (key.substr(0, 7) === 'create_') {
                    model = key.substr(7);
                    id = data.id;
                    delete data.id;
                    this._manipulateConvertIds(id_to_record_map, model, data);
                    record = (yield this._manipulateCreate(model, data));
                    if (id) {
                        id_to_record_map[id] = record;
                    }
                }
                else if (key.substr(0, 7) === 'delete_') {
                    model = key.substr(7);
                    yield this._manipulateDelete(model, data);
                }
                else if (key === 'deleteAll') {
                    yield this._manipulateDeleteAllModels();
                }
                else if (key.substr(0, 5) === 'drop_') {
                    model = key.substr(5);
                    yield this._manipulateDropModel(model);
                }
                else if (key === 'dropAll') {
                    yield this._manipulateDropAllModels();
                }
                else if (key.substr(0, 5) === 'find_') {
                    model = key.substr(5);
                    id = data.id;
                    delete data.id;
                    if (!id) {
                        continue;
                    }
                    records = (yield this._manipulateFind(model, data));
                    id_to_record_map[id] = records;
                }
                else {
                    throw new Error('unknown command: ' + key);
                }
            }
            return id_to_record_map;
        });
    }
}
exports.ConnectionManipulate = ConnectionManipulate;
