import { expect } from 'chai';
import * as sinon from 'sinon';
import * as cormo from '../..';

export default function(db: any, db_config: any) {
  if (db !== 'mysql') {
    return;
  }

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

  it('set table description at create', async () => {
    class User extends cormo.BaseModel { }
    User.column('name', String);
    User.description = 'User model';

    // using Decorator
    @cormo.Model({ description: 'Guest model' })
    class Guest extends cormo.BaseModel {
      @cormo.Column(String)
      public name!: string;
    }

    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add table users' },
      ...db === 'mysql' ? [{ message: '  (CREATE TABLE `users` ( `id` INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY,`name` VARCHAR(255) NULL ) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT=\'User model\')', is_query: true, ignorable: true }] : [],
      { message: 'Add table guests' },
      ...db === 'mysql' ? [{ message: '  (CREATE TABLE `guests` ( `id` INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY,`name` VARCHAR(255) NULL ) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT=\'Guest model\')', is_query: true, ignorable: true }] : [],
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    const schema = await (connection._adapter as any).getSchemas();
    const table_names = Object.keys(schema.tables);
    expect(table_names.sort()).to.eql(['guests', 'users']);
  });

  it('change table description after create', async () => {
    class User extends cormo.BaseModel { }
    User.column('name', String);

    await connection.applySchemas();

    User.description = 'User model';
    connection._schema_changed = true;

    expect(await connection.getSchemaChanges()).to.eql([
      { message: "Change table users's description to 'User model'" },
      ...db === 'mysql' ? [{ message: "  (ALTER TABLE users COMMENT 'User model')", is_query: true, ignorable: true }] : [],
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    const schema = await (connection._adapter as any).getSchemas();
    const table_names = Object.keys(schema.tables);
    expect(table_names.sort()).to.eql(['users']);
  });
}
