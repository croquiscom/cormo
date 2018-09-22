import { BaseModel, IColumnProperty } from './model';
import * as types from './types';
export declare function Column(column_property: IColumnProperty | types.ColumnType): (target: BaseModel, propertyKey: string) => void;
