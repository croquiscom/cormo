import * as cormo from '../lib/esm/index.js';
import cases, { TeamRef, EventRef, CommentRef } from './cases/integrity.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('integrity-' + db, () => {
    const models = {
      Team: TeamRef,
      Event: EventRef,
      Comment: CommentRef,
      connection: null as cormo.Connection | null,
    };

    before(() => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
    });

    beforeEach(async () => {
      @cormo.Model()
      class Team extends _g.BaseModel {
        @cormo.Column('string')
        public name?: string;
      }
      models.Team = Team;

      @cormo.Model()
      // eslint-disable-next-line @typescript-eslint/no-shadow
      class Event extends _g.BaseModel {
        @cormo.Column('date')
        public time?: Date;
      }
      models.Event = Event;

      @cormo.Model()
      // eslint-disable-next-line @typescript-eslint/no-shadow
      class Comment extends _g.BaseModel {
        @cormo.Column('string')
        public content?: string;
      }
      models.Comment = Comment;

      await _g.connection!.dropAllModels();
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    cases(models);
  });
});
