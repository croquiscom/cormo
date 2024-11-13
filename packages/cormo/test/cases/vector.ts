import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

export class DocumentRef extends cormo.BaseModel {
  public name?: string;
  public embedding?: number[];
}

export default function (models: { Document: typeof DocumentRef; connection: cormo.Connection | null }) {
  it('create & find', async function () {
    const record = await models.Document.create({ name: 'doc1', embedding: [1, 2, 3] });
    expect(record).to.have.deep.property('embedding', [1, 2, 3]);
    const found = await models.Document.find(record.id);
    expect(found).to.have.deep.property('embedding', [1, 2, 3]);
  });

  it('update', async function () {
    const record = await models.Document.create({ name: 'doc1', embedding: [1, 2, 3] });
    await models.Document.find(record.id).update({ embedding: [4, 5, 6] });
    const found = await models.Document.find(record.id);
    expect(found).to.have.deep.property('embedding', [4, 5, 6]);
  });
}
