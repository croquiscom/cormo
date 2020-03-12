import * as sinon from 'sinon';
import * as cormo from '../..';

export default function(db: any, db_config: any) {
  let connection!: cormo.Connection;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    connection = new cormo.Connection(db, db_config);
  });

  afterEach(async () => {
    await connection.dropAllModels();
    connection.close();
    sandbox.restore();
  });

}
