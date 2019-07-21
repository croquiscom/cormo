// tslint:disable:max-classes-per-file

import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;

  public posts?: { build: (data: any) => PostRef } & ((reload?: boolean) => PostRef[]);

  public computer?: () => ComputerRef | null;
}

export class PostRef extends cormo.BaseModel {
  public title?: string | null;

  public body?: string | null;

  public user?: () => UserRef | null;

  public user_id?: number | null;

  public comments?: () => PostRef[];

  public parent_post?: () => PostRef | null;

  public parent_post_id?: number | null;
}

export class ComputerRef extends cormo.BaseModel {
  public brand?: string | null;

  public user?: () => UserRef | null;

  public user_id?: number | null;
}
