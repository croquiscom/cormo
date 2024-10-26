import * as cormo from 'cormo';
export function Model(options = {}) {
    const c = cormo.Model({ connection: options.connection, name: options.name, description: options.description });
    return (ctor) => {
        c(ctor);
    };
}
export function Column(options) {
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
export function ObjectColumn(options) {
    const c = cormo.ObjectColumn(options.type);
    return (target, propertyKey) => {
        c(target, propertyKey);
    };
}
export function HasMany(options) {
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
export function HasOne(options) {
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
export function BelongsTo(options) {
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
export function Index(columns, options) {
    const c = cormo.Index(columns, options);
    return (ctor) => {
        c(ctor);
    };
}
