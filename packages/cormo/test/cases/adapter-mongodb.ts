// tslint:disable:max-classes-per-file

import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import * as cormo from '../..';

export default function(models: {
  connection: cormo.Connection<cormo.MongoDBAdapter> | null,
}) {
  describe('issues', () => {
    it('insert more than 1000', async () => {
      class Simple extends cormo.BaseModel { }
      Simple.column('value', Number);
      const range = Array.from({ length: 1500 }, (v, i) => i + 1);
      const records = await Simple.createBulk(range.map((i) => ({ value: i })));
      for (const i of range) {
        expect(records[i - 1]).to.have.property('value', i);
      }
    });
  });

  describe('collection', () => {
    it('find', async () => {
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
      const cursor = await models.connection!.adapter.collection('User').find({ age: 27 });
      const result = await cursor.toArray();
      expect(result).to.have.length(2);
      expect(result[0]).to.eql({ _id: new ObjectId(users[0].id), name: users[0].name, age: users[0].age });
      expect(result[1]).to.eql({ _id: new ObjectId(users[2].id), name: users[2].name, age: users[2].age });
    });
  });
}
