import * as cormo from '../../lib/esm/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;

  public posts?: { build: (data: any) => PostRef } & ((reload?: boolean) => Promise<PostRef[]>);

  public computer?: () => Promise<ComputerRef | null>;
}

export class PostRef extends cormo.BaseModel {
  public title?: string | null;

  public body?: string | null;

  public user?: () => Promise<UserRef | null>;

  public user_id?: number | null;

  public comments?: () => Promise<PostRef[]>;

  public parent_post?: () => Promise<PostRef | null>;

  public parent_post_id?: number | null;
}

export class ComputerRef extends cormo.BaseModel {
  public brand?: string | null;

  public user?: () => Promise<UserRef | null>;

  public user_id?: number | null;
}
