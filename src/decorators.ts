import {
  IAssociationBelongsToOptions,
  IAssociationHasManyOptions,
  IAssociationHasOneOptions,
} from './connection';
import {
  BaseModel,
  IColumnProperty,
} from './model';
import * as types from './types';

export function Column(column_property: IColumnProperty | types.ColumnType) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    ctor.column(propertyKey, column_property);
  };
}

export function HasMany(options?: IAssociationHasManyOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    ctor.hasMany(propertyKey, options);
  };
}

export function HasOne(options?: IAssociationHasOneOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    ctor.hasOne(propertyKey, options);
  };
}

export function BelongsTo(options?: IAssociationBelongsToOptions) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    ctor.belongsTo(propertyKey, options);
  };
}
