"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Index = exports.BelongsTo = exports.HasOne = exports.HasMany = exports.ObjectColumn = exports.Column = exports.Model = void 0;
function Model(options = {}) {
    return (ctor) => {
        ctor._initialize_called = true;
        if (options.name) {
            ctor.table_name = options.name;
        }
        ctor.description = options.description;
        ctor.query_record_id_as_string = options.query_record_id_as_string ?? false;
        if (options.connection) {
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
                else if (decorator.type === 'index') {
                    ctor.index(decorator.columns, decorator.options);
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
        ctor._property_decorators.push({ type: 'column', propertyKey: propertyKey.toString(), column_property });
    };
}
exports.Column = Column;
function ObjectColumn(partial_model_class) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        const column_property = {};
        for (const decorator of partial_model_class._property_decorators) {
            if (decorator.type === 'column') {
                column_property[decorator.propertyKey] = decorator.column_property;
            }
        }
        if (!ctor._object_column_classes) {
            ctor._object_column_classes = [];
        }
        ctor._object_column_classes.push({ column: propertyKey.toString(), klass: partial_model_class });
        ctor._property_decorators.push({ type: 'column', propertyKey: propertyKey.toString(), column_property });
    };
}
exports.ObjectColumn = ObjectColumn;
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
function Index(columns, options) {
    return (ctor) => {
        if (ctor._initialize_called) {
            ctor.index(columns, options);
        }
        else {
            if (!ctor._property_decorators) {
                ctor._property_decorators = [];
            }
            ctor._property_decorators.push({ type: 'index', columns, options });
        }
    };
}
exports.Index = Index;
