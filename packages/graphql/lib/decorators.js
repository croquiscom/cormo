"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = Model;
exports.Column = Column;
exports.ObjectColumn = ObjectColumn;
exports.HasMany = HasMany;
exports.HasOne = HasOne;
exports.BelongsTo = BelongsTo;
exports.Index = Index;
const cormo = __importStar(require("cormo"));
function Model(options = {}) {
    const c = cormo.Model({ connection: options.connection, name: options.name, description: options.description });
    return (ctor) => {
        c(ctor);
    };
}
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
        description: options.description,
        unique: options.unique,
    });
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
function ObjectColumn(options) {
    const c = cormo.ObjectColumn(options.type);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
function HasMany(options) {
    const c_options = {
        foreign_key: options.foreign_key,
        integrity: options.integrity,
        type: options.type,
    };
    const c = cormo.HasMany(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
function HasOne(options) {
    const c_options = {
        foreign_key: options.foreign_key,
        integrity: options.integrity,
        type: options.type,
    };
    const c = cormo.HasOne(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
function BelongsTo(options) {
    const c_options = {
        foreign_key: options.foreign_key,
        required: options.required,
        type: options.type,
    };
    const c = cormo.BelongsTo(c_options);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
function Index(columns, options) {
    const c = cormo.Index(columns, options);
    return (ctor) => {
        c(ctor);
    };
}
