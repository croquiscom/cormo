import {
  Connection,
  IAssociationBelongsToOptions,
  IAssociationHasManyOptions,
  IAssociationHasOneOptions,
} from './connection';
import {
  BaseModel,
  IColumnProperty,
} from './model';
import * as types from './types';

export function Model(options?: { connection?: Connection }) {
  return (ctor: typeof BaseModel) => {
    if (options && options.connection) {
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
        }
      }
    }
  };
}

export function Column(column_property: IColumnProperty | types.ColumnType) {
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
