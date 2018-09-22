import { BaseModel, IColumnProperty } from './model';
import * as types from './types';

export function Column(column_property: IColumnProperty | types.ColumnType) {
  return (target: BaseModel, propertyKey: string) => {
    const ctor = target.constructor as typeof BaseModel;
    ctor.column(propertyKey, column_property);
  };
}
