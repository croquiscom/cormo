export function Model(options = {}) {
    return (ctor) => {
        ctor._initialize_called = true;
        if (options.name) {
            ctor.table_name = options.name;
        }
        ctor.description = options.description;
        ctor.query_record_id_as_string = options.query_record_id_as_string ?? false;
        ctor.pg_schema = options.pg_schema;
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
export function Column(column_property) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'column', propertyKey: propertyKey.toString(), column_property });
    };
}
export function ObjectColumn(partial_model_class) {
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
export function HasMany(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'hasMany', propertyKey, options });
    };
}
export function HasOne(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'hasOne', propertyKey, options });
    };
}
export function BelongsTo(options) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        if (!ctor._property_decorators) {
            ctor._property_decorators = [];
        }
        ctor._property_decorators.push({ type: 'belongsTo', propertyKey, options });
    };
}
export function Index(columns, options) {
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
