"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Column(column_property) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        ctor.column(propertyKey, column_property);
    };
}
exports.Column = Column;
function HasMany(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        ctor.hasMany(propertyKey, options);
    };
}
exports.HasMany = HasMany;
function HasOne(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        ctor.hasOne(propertyKey, options);
    };
}
exports.HasOne = HasOne;
function BelongsTo(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        ctor.belongsTo(propertyKey, options);
    };
}
exports.BelongsTo = BelongsTo;
