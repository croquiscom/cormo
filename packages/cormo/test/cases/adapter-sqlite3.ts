import { expect } from 'chai';
import * as cormo from '../..';

export default function (models: { connection: cormo.Connection<cormo.SQLite3Adapter> | null }) {
  describe('issues', () => {
    it('reserved words', async () => {
      class Reference extends cormo.BaseModel {
        public group!: number;
      }
      Reference.index({ group: 1 });
      Reference.column('group', 'integer');

      const data = [{ group: 1 }, { group: 1 }, { group: 2 }, { group: 3 }];
      const records = await Reference.createBulk(data);

      const record = await Reference.find(records[0].id).select('group');
      expect(record.id).to.eql(records[0].id);
      expect(record.group).to.eql(records[0].group);

      const count = await Reference.count({ group: 1 });
      expect(count).to.eql(2);

      const count_per_group = await Reference.where()
        .group('group', { count: { $sum: 1 } })
        .order('group');
      expect(count_per_group).to.eql([
        { group: 1, count: 2 },
        { group: 2, count: 1 },
        { group: 3, count: 1 },
      ]);

      const sum_of_group = await Reference.where().group(null, { count: { $sum: '$group' } });
      expect(sum_of_group).to.eql([{ count: 7 }]);
    });

    it('#5 invalid json value', async () => {
      class Test extends cormo.BaseModel {
        public name!: string;
      }
      Test.column('name', String);
      Test.column('object', { type: Object, required: true });
      Test.column('array', { type: [String], required: true });
      await models.connection!.applySchemas();
      await models.connection!.adapter.run("INSERT INTO tests (name, object, array) VALUES ('croquis', '', '')");
      const records = await Test.where().lean(true);
      expect(records).to.eql([{ id: records[0].id, name: 'croquis', object: null, array: null }]);
    });
  });
}
