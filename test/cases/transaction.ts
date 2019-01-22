// tslint:disable:no-unused-expression variable-name

import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;
