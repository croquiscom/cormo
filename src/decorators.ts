import {
  Connection,
  IAssociationBelongsToOptions,
  IAssociationHasManyOptions,
  IAssociationHasOneOptions,
} from './connection';
import {
  BaseModel,
  IColumnNestedProperty,
  IColumnProperty,
} from './model';
import * as types from './types';

export function Model(options: { connection?: Connection, name?: string } = {}) {
  return (ctor: typeof BaseModel) => {
    ctor._initialize_called = true;
    if (options.name) {
      ctor.table_name = options.name;
    }
    if (options.connection) {
      ctor.connection(options.connection);
    }
    if (ctor._property_decorators) {
      for (const decorator of ctor._property_decorators) {
        if (decorator.type === 'column') {
          ctor.column(decorator.propertyKey, decorator.column_property);
        } else if (decorator.type === 'hasMany') {
          ctor.hasMany(decorator.propertyKey, decorator.options);
        } else if (decorator.type === 'hasOne') {
          ctor.hasOne(decorator.propertyKey, decorator.options);
        } else if (decorator.type === 'belongsTo') {
          ctor.belongsTo(decorator.propertyKey, decorator.options);
        } else if (decorator.type === 'index') {
          ctor.index(decorator.columns, decorator.options);
        }
      }
    }
  };
}

export function Column(column_property: types.ColumnType | IColumnProperty | IColumnNestedProperty) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    if (!ctor._property_decorators) {
      ctor._property_decorators = [];
    }
    ctor._property_decorators.push({ type: 'column', propertyKey, column_property });
  };
}

export function HasMany(options?: IAssociationHasManyOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    if (!ctor._property_decorators) {
      ctor._property_decorators = [];
    }
    ctor._property_decorators.push({ type: 'hasMany', propertyKey, options });
  };
}

export function HasOne(options?: IAssociationHasOneOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    if (!ctor._property_decorators) {
      ctor._property_decorators = [];
    }
    ctor._property_decorators.push({ type: 'hasOne', propertyKey, options });
  };
}

export function BelongsTo(options?: IAssociationBelongsToOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    if (!ctor._property_decorators) {
      ctor._property_decorators = [];
    }
    ctor._property_decorators.push({ type: 'belongsTo', propertyKey, options });
  };
}

export function Index(columns: { [column: string]: 1 | -1 }, options?: { name?: string, unique?: boolean }) {
  return (ctor: typeof BaseModel) => {
    if (ctor._initialize_called) {
      ctor.index(columns, options);
    } else {
      ctor._property_decorators.push({ type: 'index', columns, options });
    }
  };
}
