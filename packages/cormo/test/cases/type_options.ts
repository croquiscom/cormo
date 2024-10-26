import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

import { Type } from './type.js';

export default function (models: { Type: typeof Type; connection: cormo.Connection | null }) {
  it('string length(function)', async () => {
    try {
      @cormo.Model()
      class TypeOptionsString1 extends cormo.BaseModel {
        @cormo.Column(cormo.types.String(5))
        public col?: string;
      }
      await models.connection!.applySchemas();
      await TypeOptionsString1.create({ col: '01234' });
      let record;
      try {
        record = await TypeOptionsString1.create({ col: '0123456789' });
      } catch {
        return;
      }
      // MySQL non-strict mode accepts long string
      const result = await TypeOptionsString1.find(record.id);
      expect(result.col).to.eql('01234');
    } catch (error: any) {
      // MongoDB, Sqlite3 does not support String type with length, just skip
      expect(error.message).to.eql('this adapter does not support String type with length');
      return;
    }
  });

  it('string length(string)', async () => {
    try {
      @cormo.Model()
      class TypeOptionsString2 extends cormo.BaseModel {
        @cormo.Column('string(5)' as any)
        public col?: string;
      }
      await models.connection!.applySchemas();
      await TypeOptionsString2.create({ col: '01234' });
      let record;
      try {
        record = await TypeOptionsString2.create({ col: '0123456789' });
      } catch {
        return;
      }
      // MySQL non-strict mode accepts long string
      const result = await TypeOptionsString2.find(record.id);
      expect(result.col).to.eql('01234');
    } catch (error: any) {
      // MongoDB, Sqlite3 does not support String type with length, just skip
      expect(error.message).to.eql('this adapter does not support String type with length');
      return;
    }
  });
}
