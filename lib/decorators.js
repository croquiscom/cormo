"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Column(column_property) {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        ctor.column(propertyKey, column_property);
    };
}
exports.Column = Column;
