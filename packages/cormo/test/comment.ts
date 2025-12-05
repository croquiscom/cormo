/**
 * Query Comment Test
 */

import { Readable } from 'stream';
import { expect } from 'chai';
import { AdapterFindOptions, AdapterCountOptions, AdapterDeleteOptions } from '../src/adapters/base.js';
import { SQLAdapterBase } from '../src/adapters/sql_base.js';
import * as cormo from '../src/index.js';
import _g from './support/common.js';

// Type helper for User model
class IUser extends cormo.BaseModel {
  public name!: string;
  public age!: number;
  public email?: string;
}

describe('Query Comment', () => {
  class Adapter extends SQLAdapterBase {
    public create(
      _model_name: string,
      _data: any,
      _options: { transaction?: cormo.Transaction; use_id_in_data?: boolean; comment?: string },
    ): Promise<any> {
      throw new Error('Method not implemented.');
    }
    public createBulk(
      _model_name: string,
      _data: any[],
      _options: { transaction?: cormo.Transaction; use_id_in_data?: boolean; comment?: string },
    ): Promise<any[]> {
      throw new Error('Method not implemented.');
    }
    public update(
      _model_name: string,
      _data: any,
      _options: { transaction?: cormo.Transaction; comment?: string },
    ): Promise<void> {
      throw new Error('Method not implemented.');
    }
    public updatePartial(
      _model_name: string,
      _data: any,
      _conditions: Array<Record<string, any>>,
      _options: { transaction?: cormo.Transaction; comment?: string },
    ): Promise<number> {
      throw new Error('Method not implemented.');
    }
    public findById(
      _model_name: string,
      _id: any,
      _options: {
        select?: string[];
        explain?: boolean;
        transaction?: cormo.Transaction;
        node?: 'master' | 'read';
        comment?: string;
      },
    ): Promise<any> {
      throw new Error('Method not implemented.');
    }
    public find(
      _model_name: string,
      _conditions: Array<Record<string, any>>,
      _options: AdapterFindOptions,
    ): Promise<any> {
      throw new Error('Method not implemented.');
    }
    public stream(
      _model_name: string,
      _conditions: Array<Record<string, any>>,
      _options: AdapterFindOptions,
    ): Readable {
      throw new Error('Method not implemented.');
    }
    public count(
      _model_name: string,
      _conditions: Array<Record<string, any>>,
      _options: AdapterCountOptions,
    ): Promise<number> {
      throw new Error('Method not implemented.');
    }
    public delete(
      _model_name: string,
      _conditions: Array<Record<string, any>>,
      _options: AdapterDeleteOptions,
    ): Promise<number> {
      throw new Error('Method not implemented.');
    }
    public close(): void {
      throw new Error('Method not implemented.');
    }
    sanitizeComment(comment?: string): string {
      return super.sanitizeComment(comment);
    }
    createCommentedSQL(sql: string, comment?: string): string {
      return super.createCommentedSQL(sql, comment);
    }
  }
  const adapter = new Adapter();
  describe('sanitizeComment', () => {
    it('should allow alphanumeric characters', () => {
      const result = adapter.sanitizeComment('test123ABC');
      expect(result).to.equal('test123ABC');
    });

    it('should allow spaces', () => {
      const result = adapter.sanitizeComment('test query comment');
      expect(result).to.equal('test query comment');
    });

    it('should allow underscores and hyphens', () => {
      const result = adapter.sanitizeComment('test_query-comment');
      expect(result).to.equal('test_query-comment');
    });

    it('should allow Korean characters', () => {
      const result = adapter.sanitizeComment('사용자 조회');
      expect(result).to.equal('사용자 조회');
    });

    it('should allow mixed Korean and English', () => {
      const result = adapter.sanitizeComment('사용자 User 조회');
      expect(result).to.equal('사용자 User 조회');
    });

    it('should remove SQL special characters', () => {
      const result = adapter.sanitizeComment("'; DROP TABLE users; --");
      expect(result).to.equal(' DROP TABLE users --');
    });

    it('should remove quotes', () => {
      const result = adapter.sanitizeComment('test"query\'comment');
      expect(result).to.equal('testquerycomment');
    });

    it('should remove SQL comment markers', () => {
      const result = adapter.sanitizeComment('test /* comment */ query');
      expect(result).to.equal('test  comment  query');
    });

    it('should limit length to 100 characters', () => {
      const longString = 'a'.repeat(300);
      const result = adapter.sanitizeComment(longString);
      expect(result.length).to.equal(100);
    });

    it('should return empty string for undefined', () => {
      const result = adapter.sanitizeComment(undefined);
      expect(result).to.equal('');
    });

    it('should return empty string for empty string', () => {
      const result = adapter.sanitizeComment('');
      expect(result).to.equal('');
    });
  });

  describe('createCommentedSQL', () => {
    it('should create SQL with comment prepended', () => {
      const result = adapter.createCommentedSQL('SELECT * FROM users', 'test query');
      expect(result).to.equal('/* test query */ SELECT * FROM users');
    });

    it('should return original SQL for undefined comment', () => {
      const result = adapter.createCommentedSQL('SELECT * FROM users', undefined);
      expect(result).to.equal('SELECT * FROM users');
    });

    it('should return original SQL for empty comment', () => {
      const result = adapter.createCommentedSQL('SELECT * FROM users', '');
      expect(result).to.equal('SELECT * FROM users');
    });

    it('should sanitize comment text before creating SQL comment', () => {
      const result = adapter.createCommentedSQL('SELECT * FROM users', "test'; DROP TABLE");
      expect(result).to.equal('/* test DROP TABLE */ SELECT * FROM users');
    });

    it('should work with Korean characters', () => {
      const result = adapter.createCommentedSQL('SELECT * FROM users', '사용자 조회');
      expect(result).to.equal('/* 사용자 조회 */ SELECT * FROM users');
    });

    it('should work with complex SQL', () => {
      const sql = 'INSERT INTO users (name, age) VALUES (?, ?)';
      const result = adapter.createCommentedSQL(sql, '사용자 생성');
      expect(result).to.equal('/* 사용자 생성 */ INSERT INTO users (name, age) VALUES (?, ?)');
    });

    it('should work with UPDATE statements', () => {
      const sql = 'UPDATE users SET name = ? WHERE id = ?';
      const result = adapter.createCommentedSQL(sql, '프로필 업데이트');
      expect(result).to.equal('/* 프로필 업데이트 */ UPDATE users SET name = ? WHERE id = ?');
    });
  });
});

const _dbs = ['mysql', 'postgresql', 'sqlite3'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('Query Comment Integration - ' + db, () => {
    let connection: cormo.Connection | null;
    let User: typeof IUser;
    let lastQuery = '';

    before(async () => {
      _g.connection = connection = new cormo.Connection(db as any, _g.db_configs[db]);

      // Enable query logging and capture last query
      connection._logger.logQuery = (query: string) => {
        lastQuery = query;
      };

      @cormo.Model()
      class UserModel extends IUser {
        @cormo.Column(String)
        public name!: string;

        @cormo.Column(Number)
        public age!: number;

        @cormo.Column(String)
        public email?: string;
      }
      User = UserModel;

      await connection.dropAllModels();
      await connection.applySchemas();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([User]);
    });

    after(async () => {
      if (connection) {
        await connection.dropAllModels();
        connection.close();
        connection = null;
        _g.connection = null;
      }
    });

    describe('find operations', () => {
      beforeEach(async () => {
        await User.createBulk([
          { name: 'John Doe', age: 27, email: 'john@example.com' },
          { name: 'Jane Smith', age: 32, email: 'jane@example.com' },
          { name: 'Bob Johnson', age: 45, email: 'bob@example.com' },
        ]);
      });

      it('should only find with comment', async () => {
        const user = await User.find(1).comment('1번 사용자 조회');

        expect(user).to.eql({
          id: 1,
          name: 'John Doe',
          age: 27,
          email: 'john@example.com',
        });
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 1번 사용자 조회 */');
        }
      });

      it('should execute find with comment', async () => {
        const users = await User.query()
          .where({ age: { $gte: 30 } })
          .comment('사용자 조회 - 30세 이상')
          .exec();

        expect(users).to.have.length(2);
        expect(users.map((u: any) => u.name).sort()).to.eql(['Bob Johnson', 'Jane Smith']);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 사용자 조회 - 30세 이상 */');
        }
      });

      it('should execute find with Korean and English mixed comment', async () => {
        const user = await User.query().where({ name: 'John Doe' }).comment('User 조회 - John').exec();

        expect(user).to.have.length(1);
        expect(user[0].name).to.equal('John Doe');
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* User 조회 - John */');
        }
      });

      it('should work without comment', async () => {
        const users = await User.query()
          .where({ age: { $lt: 40 } })
          .exec();

        expect(users).to.have.length(2);
        expect(lastQuery).to.not.include('/*');
      });

      it('should execute count with comment', async () => {
        const count = await User.query()
          .where({ age: { $gte: 30 } })
          .comment('사용자 수 집계')
          .count();

        expect(count).to.equal(2);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 사용자 수 집계 */');
        }
      });

      it('should execute find with special characters in comment (should be sanitized)', async () => {
        const users = await User.query()
          .where({ age: { $gte: 30 } })
          .comment("'; DROP TABLE users; --")
          .exec();

        expect(users).to.have.length(2);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/*  DROP TABLE users -- */');
          expect(lastQuery).to.not.include("'");
          expect(lastQuery).to.not.include(';');
        }
      });
    });

    describe('create operations', () => {
      beforeEach(async () => {
        await _g.deleteAllRecords([User]);
      });

      it('should execute create with comment', async () => {
        const user = await User.create(
          { name: 'New User', age: 28, email: 'new@example.com' },
          { comment: '신규 사용자 생성' },
        );

        expect(user.name).to.equal('New User');
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 신규 사용자 생성 */');
          expect(lastQuery).to.include('INSERT');
        }
      });

      it('should execute createBulk with comment', async () => {
        const users = await User.createBulk(
          [
            { name: 'User1', age: 25, email: 'user1@example.com' },
            { name: 'User2', age: 26, email: 'user2@example.com' },
          ],
          { comment: '대량 사용자 생성' },
        );

        expect(users).to.have.length(2);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 대량 사용자 생성 */');
          expect(lastQuery).to.include('INSERT');
        }
      });

      it('should execute create without comment', async () => {
        const user = await User.create({ name: 'No Comment User', age: 29, email: 'nocomment@example.com' });

        expect(user.name).to.equal('No Comment User');
        if (db !== 'sqlite3') {
          expect(lastQuery).to.not.include('/*');
          expect(lastQuery).to.include('INSERT');
        }
      });
    });

    describe('update operations', () => {
      let userId: any;

      beforeEach(async () => {
        const users = await User.createBulk([
          { name: 'John Doe', age: 27, email: 'john@example.com' },
          { name: 'Jane Smith', age: 32, email: 'jane@example.com' },
        ]);
        userId = users[0].id;
      });

      it('should execute update with comment', async () => {
        lastQuery = '';
        const count = await User.query()
          .where({ id: userId })
          .comment('프로필 업데이트')
          .update({ name: 'John Updated' });

        expect(count).to.equal(1);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 프로필 업데이트 */');
          expect(lastQuery).to.include('UPDATE');
        }

        const user = await User.find(userId);
        expect(user.name).to.equal('John Updated');
      });

      it('should execute bulk update with comment', async () => {
        lastQuery = '';
        const count = await User.query()
          .where({ age: { $gte: 30 } })
          .comment('나이 업데이트 - 30세 이상')
          .update({ age: 35 });

        expect(count).to.equal(1);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 나이 업데이트 - 30세 이상 */');
          expect(lastQuery).to.include('UPDATE');
        }

        const users = await User.query().where({ age: 35 }).exec();
        expect(users).to.have.length(1);
      });

      it('should execute Model.update with comment', async () => {
        lastQuery = '';
        const count = await User.update(
          { age: 40 },
          { age: { $gte: 30 } },
          { comment: 'Model.update - 나이 일괄 수정' },
        );

        expect(count).to.equal(1);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* Modelupdate - 나이 일괄 수정 */');
          expect(lastQuery).to.include('UPDATE');
        }

        const users = await User.query().where({ age: 40 }).exec();
        expect(users).to.have.length(1);
      });
    });

    describe('save operations', () => {
      let userId: any;

      beforeEach(async () => {
        const user = await User.create({ name: 'John Doe', age: 27, email: 'john@example.com' });
        userId = user.id;
      });

      it('should execute save (update) with comment', async () => {
        const user = await User.find(userId);
        user.age = 30;
        user.name = 'John Updated';

        lastQuery = '';
        await user.save({ comment: '프로필 수정 - 사용자 편집' });

        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 프로필 수정 - 사용자 편집 */');
          expect(lastQuery).to.include('UPDATE');
        }

        const updated = await User.find(userId);
        expect(updated.age).to.equal(30);
        expect(updated.name).to.equal('John Updated');
      });

      it('should execute save (create) with comment', async () => {
        const newUser = new User({ name: 'New User', age: 25, email: 'new@example.com' });

        lastQuery = '';
        await newUser.save({ comment: '신규 사용자 저장' });

        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 신규 사용자 저장 */');
          expect(lastQuery).to.include('INSERT');
        }

        expect(newUser.id).to.exist;
        const found = await User.find(newUser.id);
        expect(found.name).to.equal('New User');
      });

      it('should execute save without comment', async () => {
        const user = await User.find(userId);
        user.age = 28;

        lastQuery = '';
        await user.save();

        if (db !== 'sqlite3') {
          expect(lastQuery).to.not.include('/*');
          expect(lastQuery).to.include('UPDATE');
        }
      });
    });

    describe('delete operations', () => {
      beforeEach(async () => {
        await User.createBulk([
          { name: 'John Doe', age: 27, email: 'john@example.com' },
          { name: 'Jane Smith', age: 32, email: 'jane@example.com' },
          { name: 'Bob Johnson', age: 45, email: 'bob@example.com' },
        ]);
      });

      it('should execute delete with comment', async () => {
        lastQuery = '';
        const count = await User.query()
          .where({ age: { $lt: 30 } })
          .comment('사용자 삭제 - 30세 미만')
          .delete();

        expect(count).to.equal(1);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 사용자 삭제 - 30세 미만 */');
          expect(lastQuery).to.include('DELETE');
        }

        const remaining = await User.count();
        expect(remaining).to.equal(2);
      });

      it('should execute Model.delete with comment', async () => {
        lastQuery = '';
        const count = await User.delete({ age: { $gte: 40 } }, { comment: 'Model.delete - 40세 이상 삭제' });

        expect(count).to.equal(1);
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* Modeldelete - 40세 이상 삭제 */');
          expect(lastQuery).to.include('DELETE');
        }

        const remaining = await User.count();
        expect(remaining).to.equal(2);
      });
    });

    describe('upsert operations', () => {
      it('should execute upsert (insert) with comment', async () => {
        lastQuery = '';
        await User.query()
          .where({ email: 'new@example.com' })
          .comment('사용자 Upsert - 신규')
          .upsert({ name: 'New User', age: 25, email: 'new@example.com' });

        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 사용자 Upsert - 신규 */');
          expect(lastQuery).to.include('INSERT');
        }

        const users = await User.query().where({ email: 'new@example.com' }).exec();
        expect(users).to.have.length.at.least(1);
        expect(users[0].name).to.equal('New User');
      });

      // Note: upsert update behavior differs by database
      // MySQL uses ON DUPLICATE KEY UPDATE which requires actual key conflict
      // SQLite/PostgreSQL use updatePartial approach
      if (db === 'sqlite3') {
        it('should execute upsert (update) with comment', async () => {
          const created = await User.create({ name: 'Existing User', age: 30, email: 'existing@example.com' });
          const createdId = created.id;

          // Use id instead of email to ensure update happens
          await User.query()
            .where({ id: createdId })
            .comment('사용자 Upsert - 업데이트')
            .upsert({ name: 'Updated User', age: 31 });

          const user = await User.find(createdId);
          expect(user.name).to.equal('Updated User');
          expect(user.age).to.equal(31);

          // Verify no duplicate was created
          const allUsers = await User.count();
          expect(allUsers).to.equal(1);
        });
      }
    });

    describe('complex queries', () => {
      beforeEach(async () => {
        await User.createBulk([
          { name: 'Alice', age: 25, email: 'alice@example.com' },
          { name: 'Bob', age: 30, email: 'bob@example.com' },
          { name: 'Charlie', age: 35, email: 'charlie@example.com' },
          { name: 'David', age: 40, email: 'david@example.com' },
          { name: 'Eve', age: 45, email: 'eve@example.com' },
        ]);
      });

      it('should execute complex query with select, order, limit and comment', async () => {
        const users = await User.query()
          .where({ age: { $gte: 30 } })
          .select('name age')
          .order('-age')
          .limit(2)
          .comment('복잡한 쿼리 - 상위 2명')
          .exec();

        expect(users).to.have.length(2);
        expect((users[0] as any).name).to.equal('Eve');
        expect((users[1] as any).name).to.equal('David');
        expect((users[0] as any).email).to.be.undefined;
        if (db !== 'sqlite3') {
          expect(lastQuery).to.include('/* 복잡한 쿼리 - 상위 2명 */');
        }
      });

      it('should chain multiple query methods with comment', async () => {
        const count = await User.query()
          .where({ age: { $gte: 30 } })
          .where({ age: { $lte: 40 } })
          .comment('범위 쿼리 - 30-40세')
          .count();

        expect(count).to.equal(3);
      });
    });
  });
});
