// tslint:disable:no-unused-expression variable-name max-classes-per-file

import { expect } from 'chai';
import * as cormo from '..';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql', 'redis'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('setup-' + db, () => {
    let connection: cormo.Connection | null;

    afterEach(async () => {
      await connection!.dropAllModels();
      connection!.close();
      connection = null;
    });

    it('can process without waiting connected and schemas applied', async () => {
      connection = new cormo.Connection(db as any, _g.db_configs[db]);
      const User = connection.model('User', {
        age: Number,
        name: String,
      });
      const user = await User.create({ name: 'John Doe', age: 27 });
      const record = await User.find(user.id);
      expect(record).to.exist;
      expect(record).to.be.an.instanceof(User);
      expect(record).to.have.property('id', user.id);
      expect(record).to.have.property('name', (user as any).name);
      expect(record).to.have.property('age', (user as any).age);
    });

    it('association order', async () => {
      connection = new cormo.Connection(db as any, _g.db_configs[db]);
      @cormo.Model()
      class Ace extends cormo.BaseModel {
        @cormo.HasOne({ integrity: 'delete' })
        public car!: Car | null;

        @cormo.BelongsTo()
        public bear!: Bear | null;
      }

      @cormo.Model()
      class Bear extends cormo.BaseModel {
        @cormo.HasMany({ integrity: 'delete' })
        public aces!: Ace[];

        @cormo.BelongsTo()
        public dog!: Dog | null;
      }

      @cormo.Model()
      class Car extends cormo.BaseModel {
        @cormo.BelongsTo()
        public bear!: Bear | null;
      }

      @cormo.Model()
      class Dog extends cormo.BaseModel {
        @cormo.HasMany({ integrity: 'delete' })
        public aces!: Ace[];
      }

      await connection.applySchemas();
      await connection.dropAllModels();
    });
  });
});
