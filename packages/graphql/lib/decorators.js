"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cormo = __importStar(require("cormo"));
function Model(options = {}) {
    const c = cormo.Model({ connection: options.connection, name: options.name });
    return (ctor) => {
        c(ctor);
        ctor._graphql = {
            description: options.description,
        };
    };
}
exports.Model = Model;
function Column(options) {
    let cormo_type;
    if (options.enum) {
        cormo_type = cormo.types.Integer;
    }
    else {
        cormo_type = options.type;
    }
    const c = cormo.Column({
        default_value: options.default_value,
        name: options.name,
        required: options.required,
        type: cormo_type,
        unique: options.unique,
    });
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
exports.Column = Column;
function ObjectColumn(options) {
    const c = cormo.ObjectColumn(options.type);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
exports.ObjectColumn = ObjectColumn;
function HasMany(options) {
    const cormo_type = options.type;
    const c_options = {
        foreign_key: options.foreign_key,
        integrity: options.integrity,
        type: cormo_type.name,
    };
    const c = cormo.HasMany(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
exports.HasMany = HasMany;
function HasOne(options) {
    const cormo_type = options.type;
    const c_options = {
        foreign_key: options.foreign_key,
        integrity: options.integrity,
        type: cormo_type.name,
    };
    const c = cormo.HasOne(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
exports.HasOne = HasOne;
function BelongsTo(options) {
    const c_options = {
        foreign_key: options.foreign_key,
        required: options.required,
    };
    const c = cormo.BelongsTo(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
exports.BelongsTo = BelongsTo;
function Index(columns, options) {
    const c = cormo.Index(columns, options);
    return (ctor) => {
        c(ctor);
    };
}
exports.Index = Index;
