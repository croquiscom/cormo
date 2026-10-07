import { expect, afterEach, describe, it } from 'vitest';
import * as cormo from '../../src/index.js';
import _g from '../support/common.js';

export default function (models: { connection: cormo.Connection<cormo.MySQLAdapter> | null }) {
  describe('issues', () => {
    it('delayed auth info', async () => {
      const conn = new cormo.MySQLConnection({
        implicit_apply_schemas: true,
        is_default: false,
        database: _g.db_configs.mysql.database,
        host: _g.db_configs.mysql.host,
        port: _g.db_configs.mysql.port,
        user: new Promise((resolve) => {
          setTimeout(() => {
            resolve(_g.db_configs.mysql.user);
          }, 1000);
        }),
        password: new Promise((resolve) => {
          setTimeout(() => {
            resolve(_g.db_configs.mysql.password);
          }, 1000);
        }),
      });
      const User = conn.model('User', {
        age: Number,
        name: String,
      });
      const user = await User.create({ name: 'John Doe', age: 27 });
      expect(await User.find(user.id)).toEqual({ id: user.id, name: 'John Doe', age: 27 });
      await conn.dropAllModels();
    });

    it('reserved words', async () => {
      class Reference extends cormo.BaseModel {
        public group!: number;
      }
      Reference.index({ group: 1 });
      Reference.column('group', 'integer');

      const data = [{ group: 1 }, { group: 1 }, { group: 2 }, { group: 3 }];
      const records = await Reference.createBulk(data);

      const record = await Reference.find(records[0].id).select('group');
      expect(record.id).toEqual(records[0].id);
      expect(record.group).toEqual(records[0].group);

      const count = await Reference.count({ group: 1 });
      expect(count).toEqual(2);

      const count_per_group = await Reference.where()
        .group('group', { count: { $sum: 1 } })
        .order('group');
      expect(count_per_group).toEqual([
        { group: 1, count: 2 },
        { group: 2, count: 1 },
        { group: 3, count: 1 },
      ]);

      const sum_of_group = await Reference.where().group(null, { count: { $sum: '$group' } });
      expect(sum_of_group).toEqual([{ count: 7 }]);
    });

    it('#5 invalid json value', async () => {
      class Test extends cormo.BaseModel {
        public name!: string;
      }
      Test.column('name', String);
      await Test.create({ name: 'croquis' });
      Test.column('object', { type: Object, required: true });
      Test.column('array', { type: [String], required: true });
      const records = await Test.where().lean(true);
      expect(records).toEqual([{ id: records[0].id, name: 'croquis', object: null, array: null }]);
    });

    it('text size of object type', async () => {
      class Test extends cormo.BaseModel {
        public default_size!: object;
        public tiny!: object;
        public small!: object;
        public medium!: object;
        public long!: object;
        public medium_by_string!: object;
      }
      Test.column('default_size', cormo.types.Object);
      Test.column('tiny', cormo.types.Object('tiny'));
      Test.column('small', cormo.types.Object('small'));
      Test.column('medium', cormo.types.Object('medium'));
      Test.column('long', cormo.types.Object('long'));
      Test.column('medium_by_string', 'object(medium)');
      await models.connection!.applySchemas();

      const columns = await models.connection!.adapter.query('SHOW COLUMNS FROM `tests`');
      const types_by_field = Object.fromEntries(columns.map((column: any) => [column.Field, column.Type]));
      expect(types_by_field).toEqual({
        id: expect.any(String),
        default_size: 'text',
        tiny: 'tinytext',
        small: 'text',
        medium: 'mediumtext',
        long: 'longtext',
        medium_by_string: 'mediumtext',
      });
      expect(await models.connection!.getSchemaChanges()).toEqual([]);

      const value = { key: 'value', nested: [1, 2, 3] };
      const record = await Test.create({
        default_size: value,
        tiny: value,
        small: value,
        medium: value,
        long: value,
        medium_by_string: value,
      });
      expect(await Test.find(record.id)).toEqual({
        id: record.id,
        default_size: value,
        tiny: value,
        small: value,
        medium: value,
        long: value,
        medium_by_string: value,
      });
    });

    it('select for associated column without applySchemas', async () => {
      await models.connection!.adapter.query(`
        CREATE TABLE users (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY, name VARCHAR(255));
      `);
      await models.connection!.adapter.query(`
        CREATE TABLE posts (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY,
          title VARCHAR(255), user_id INT,
          FOREIGN KEY (user_id) REFERENCES users(id)
          );
      `);
      const result = await models.connection!.adapter.query("INSERT INTO users (name) VALUES ('John Doe')");
      const user_id = result.insertId;
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('First Post', ${user_id})`);
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('Second Post', ${user_id})`);

      @cormo.Model()
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string | null;

        @cormo.HasMany()
        public posts?: { build: (data: any) => Post } & ((reload?: boolean) => Post[]);
      }

      @cormo.Model()
      class Post extends cormo.BaseModel {
        @cormo.Column(String)
        public title?: string | null;

        @cormo.BelongsTo()
        public user?: () => User | null;

        public user_id?: number | null;
      }

      const records = await Post.query().select(['title', 'user_id']).lean(true);
      expect(records).toEqual([
        { title: 'First Post', user_id },
        { title: 'Second Post', user_id },
      ]);
    });

    it('group for associated column without applySchemas', async () => {
      await models.connection!.adapter.query(`
        CREATE TABLE users (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY, name VARCHAR(255));
      `);
      await models.connection!.adapter.query(`
        CREATE TABLE posts (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY,
          title VARCHAR(255), user_id INT,
          FOREIGN KEY (user_id) REFERENCES users(id)
          );
      `);
      const result = await models.connection!.adapter.query("INSERT INTO users (name) VALUES ('John Doe')");
      const user_id = result.insertId;
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('First Post', ${user_id})`);
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('Second Post', ${user_id})`);

      @cormo.Model()
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string | null;

        @cormo.HasMany()
        public posts?: { build: (data: any) => Post } & ((reload?: boolean) => Post[]);
      }

      @cormo.Model()
      class Post extends cormo.BaseModel {
        @cormo.Column(String)
        public title?: string | null;

        @cormo.BelongsTo()
        public user?: () => User | null;

        public user_id?: number | null;
      }

      const records = await Post.query().group('user_id', { count: { $sum: 1 } });
      expect(records).toEqual([{ user_id, count: 2 }]);
    });

    it('order for associated column without applySchemas', async () => {
      await models.connection!.adapter.query(`
        CREATE TABLE users (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY, name VARCHAR(255));
      `);
      await models.connection!.adapter.query(`
        CREATE TABLE posts (id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY,
          title VARCHAR(255), user_id INT,
          FOREIGN KEY (user_id) REFERENCES users(id)
          );
      `);
      const result1 = await models.connection!.adapter.query("INSERT INTO users (name) VALUES ('John Doe')");
      const user1_id = result1.insertId;
      const result2 = await models.connection!.adapter.query("INSERT INTO users (name) VALUES ('Bill Smith')");
      const user2_id = result2.insertId;
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('First Post', ${user1_id})`);
      await models.connection!.adapter.query(`INSERT INTO posts (title, user_id) VALUES ('Second Post', ${user2_id})`);

      @cormo.Model()
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string | null;

        @cormo.HasMany()
        public posts?: { build: (data: any) => Post } & ((reload?: boolean) => Post[]);
      }

      @cormo.Model()
      class Post extends cormo.BaseModel {
        @cormo.Column(String)
        public title?: string | null;

        @cormo.BelongsTo()
        public user?: () => User | null;

        public user_id?: number | null;
      }

      const records = await Post.query().select(['title']).order('-user_id').lean(true);
      expect(records).toEqual([{ title: 'Second Post' }, { title: 'First Post' }]);
    });

    it('getTransaction without waiting connection', async () => {
      const c = new cormo.MySQLConnection(_g.db_configs.mysql);
      const t = await c.getTransaction();
      await t.rollback();
    });

    it('query without waiting connection', async () => {
      const c = new cormo.MySQLConnection(_g.db_configs.mysql);
      await c.adapter.query('SELECT 1');
    });

    it('bigint id', async () => {
      const c = new cormo.MySQLConnection(_g.db_configs.mysql);
      try {
        @cormo.Model({ connection: c })
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name?: string;
        }
        await User.create({ name: 'user 1' });
        await c.adapter.query('ALTER TABLE users AUTO_INCREMENT = 17179869184');
        await User.create({ name: 'user 2' });
        const users = await User.where();
        expect(users).toEqual([
          { id: 1, name: 'user 1' },
          { id: 17179869184, name: 'user 2' },
        ]);
      } catch (error) {
        await c.adapter.query('DROP TABLE users');
        throw error;
      }
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
      const rows = await models.connection!.adapter.query('SELECT * FROM users WHERE age=?', [27]);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ id: users[0].id, name: users[0].name, age: users[0].age });
      expect(rows[1]).toEqual({ id: users[2].id, name: users[2].name, age: users[2].age });
    });
  });

  describe('replication', () => {
    afterEach(async () => {
      await models.connection!.adapter.query('DROP TABLE users');
    });

    it('basic', async () => {
      const c = new cormo.MySQLConnection({
        ..._g.db_configs.mysql,
        replication: {
          read_replicas: [{ ..._g.db_configs.mysql }],
        },
      });
      @cormo.Model({ connection: c })
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string;

        @cormo.Column(Number)
        public age?: number;
      }
      const data = [
        { name: 'John Doe', age: 27 },
        { name: 'Bill Smith', age: 45 },
        { name: 'Alice Jackson', age: 27 },
        { name: 'Gina Baker', age: 32 },
        { name: 'Daniel Smith', age: 8 },
      ];
      const users = await User.createBulk(data);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(0);
      expect(await User.where({ age: 27 })).toEqual([
        { id: users[0].id, name: users[0].name, age: users[0].age },
        { id: users[2].id, name: users[2].name, age: users[2].age },
      ]);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(0); // query uses master client
      expect(await User.where({ age: 27 }).using('read')).toEqual([
        { id: users[0].id, name: users[0].name, age: users[0].age },
        { id: users[2].id, name: users[2].name, age: users[2].age },
      ]);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(1); // query uses read client
    });

    it('round robin', async () => {
      const c = new cormo.MySQLConnection({
        ..._g.db_configs.mysql,
        replication: {
          read_replicas: [{ ..._g.db_configs.mysql }, { ..._g.db_configs.mysql }],
          use_master_for_read: true,
        },
      });
      @cormo.Model({ connection: c })
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string;

        @cormo.Column(Number)
        public age?: number;
      }
      const data = [
        { name: 'John Doe', age: 27 },
        { name: 'Bill Smith', age: 45 },
        { name: 'Alice Jackson', age: 27 },
        { name: 'Gina Baker', age: 32 },
        { name: 'Daniel Smith', age: 8 },
      ];
      const users = await User.createBulk(data);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[1]._allConnections.length).toEqual(0);
      expect((c.adapter as any)._read_clients[2]._allConnections.length).toEqual(0);

      // first query uses master
      expect(await User.where({ age: 27 }).using('read')).toEqual([
        { id: users[0].id, name: users[0].name, age: users[0].age },
        { id: users[2].id, name: users[2].name, age: users[2].age },
      ]);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[1]._allConnections.length).toEqual(0);
      expect((c.adapter as any)._read_clients[2]._allConnections.length).toEqual(0);

      // second query uses slave1
      expect(await User.where({ age: 27 }).using('read')).toEqual([
        { id: users[0].id, name: users[0].name, age: users[0].age },
        { id: users[2].id, name: users[2].name, age: users[2].age },
      ]);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[1]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[2]._allConnections.length).toEqual(0);

      // third query uses slave2
      expect(await User.where({ age: 27 }).using('read')).toEqual([
        { id: users[0].id, name: users[0].name, age: users[0].age },
        { id: users[2].id, name: users[2].name, age: users[2].age },
      ]);
      expect((c.adapter as any)._read_clients[0]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[1]._allConnections.length).toEqual(1);
      expect((c.adapter as any)._read_clients[2]._allConnections.length).toEqual(1);
    });
  });
}
