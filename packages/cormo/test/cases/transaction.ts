import * as cormo from '../../lib/esm/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export class UserExtraRef extends cormo.BaseModel {
  public user_id?: number;

  public phone_number?: string | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;
