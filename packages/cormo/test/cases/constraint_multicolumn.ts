import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

export class VersionRef extends cormo.BaseModel {
  public major?: number | null;
  public minor?: number | null;
}

export default function (models: { Version: typeof VersionRef }) {
  it('unique', async () => {
    await models.Version.create({ major: 1, minor: 1 });
    try {
      await models.Version.create({ major: 1, minor: 1 });
      throw new Error('must throw an error.');
    } catch (error: any) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( major_minor)?$/);
      expect(error).to.exist;
    }
  });

  it('each can duplicate', async () => {
    await models.Version.create({ major: 1, minor: 1 });
    await models.Version.create({ major: 1, minor: 2 });
  });

  it('can have two null records', async () => {
    await models.Version.create({});
    await models.Version.create({});
  });
}
