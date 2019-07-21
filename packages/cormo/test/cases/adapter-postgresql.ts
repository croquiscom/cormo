// tslint:disable:max-classes-per-file

import { expect } from 'chai';
import * as cormo from '../..';

export default function(models: {
  connection: cormo.Connection<cormo.PostgreSQLAdapter> | null,
}) {
  describe('issues', () => {
    it('reserved words', async () => {
      class Reference extends cormo.BaseModel {
        public group!: number;
      }
      Reference.index({ group: 1 });
      Reference.column('group', 'integer');

      const data = [
        { group: 1 },
        { group: 1 },
        { group: 2 },
        { group: 3 },
      ];
      const records = await Reference.createBulk(data);

      const record = await Reference.find(records[0].id).select('group');
      expect(record.id).to.eql(records[0].id);
      expect(record.group).to.eql(records[0].group);

      const count = await Reference.count({ group: 1 });
      expect(count).to.eql(2);

      const count_per_group = await Reference.where().group('group', { count: { $sum: 1 } }).order('group');
      expect(count_per_group).to.eql([{ group: 1, count: 2 }, { group: 2, count: 1 }, { group: 3, count: 1 }]);
    });
  });

  describe('query', () => {
    it('basic', async () => {
      class User extends cormo.BaseModel {
        public name!: string;
        public age!: number;
      }
      User.column('name', String);
      User.column('age', Number);
      const data = [
        { name: 'John Doe', age: 27 },
        { name: 'Bill Smith', age: 45 },
        { name: 'Alice Jackson', age: 27 },
        { name: 'Gina Baker', age: 32 },
        { name: 'Daniel Smith', age: 8 },
      ];
      const users = await User.createBulk(data);
      const result = await models.connection!.adapter.query('SELECT * FROM users WHERE age=$1', [27]);
      expect(result.rows).to.have.length(2);
      expect(result.rows[0]).to.eql({ id: users[0].id, name: users[0].name, age: users[0].age });
      expect(result.rows[1]).to.eql({ id: users[2].id, name: users[2].name, age: users[2].age });
    });
  });
}
