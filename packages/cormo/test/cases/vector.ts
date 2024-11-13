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

  it('null value', async function () {
    const record = await models.Document.create({ name: 'doc1', embedding: undefined });
    expect(record).to.have.deep.property('embedding', null);
    const found = await models.Document.find(record.id);
    expect(found).to.have.deep.property('embedding', null);
  });

  it('update', async function () {
    const record = await models.Document.create({ name: 'doc1', embedding: [1, 2, 3] });
    await models.Document.find(record.id).update({ embedding: [4, 5, 6] });
    const found = await models.Document.find(record.id);
    expect(found).to.have.deep.property('embedding', [4, 5, 6]);
  });

  it('l2 distance', async function () {
    const records = await models.Document.createBulk([
      { name: 'doc1', embedding: [1, 2, 3] },
      { name: 'doc2', embedding: [4, 5, 6] },
    ]);
    expect(
      await models.Document.where()
        .vector_order({ embedding: { $l2_distance: [3, 2, 4] } })
        .selectSingle('id'),
    ).to.eql([records[0].id, records[1].id]);
    expect(
      await models.Document.where()
        .vector_order({ embedding: { $l2_distance: [3, 4, 5] } })
        .selectSingle('id'),
    ).to.eql([records[1].id, records[0].id]);
  });
}
