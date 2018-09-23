"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Model(options) {
    return (ctor) => {
        if (options && options.connection) {
            ctor.connection(options.connection);
        }
        if (ctor._property_decorators) {
            for (const decorator of ctor._property_decorators) {
                if (decorator.type === 'column') {
                    ctor.column(decorator.propertyKey, decorator.column_property);
                }
                else if (decorator.type === 'hasMany') {
                    ctor.hasMany(decorator.propertyKey, decorator.options);
                }
                else if (decorator.type === 'hasOne') {
                    ctor.hasOne(decorator.propertyKey, decorator.options);
                }
                else if (decorator.type === 'belongsTo') {
                    ctor.belongsTo(decorator.propertyKey, decorator.options);
                }
            }
        }
    };
}
exports.Model = Model;
function Column(column_property) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'column', propertyKey, column_property });
    };
}
exports.Column = Column;
function HasMany(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'hasMany', propertyKey, options });
    };
}
exports.HasMany = HasMany;
function HasOne(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'hasOne', propertyKey, options });
    };
}
exports.HasOne = HasOne;
function BelongsTo(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'belongsTo', propertyKey, options });
    };
}
exports.BelongsTo = BelongsTo;
