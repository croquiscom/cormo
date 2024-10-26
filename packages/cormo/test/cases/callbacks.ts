import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string;
  public age?: number;
}

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
  it('callbacks for a new record', () => {
    const User = models.User as any;
    const logs: string[] = [];
    User.afterFind('after_find1');
    User.prototype.after_find1 = function (this: UserRef) {
      return logs.push('after_find1 : ' + this.name);
    };
    User.afterFind(function (this: UserRef) {
      return logs.push('after_find2 : ' + this.name);
    });
    User.afterInitialize('after_initialize1');
    User.prototype.after_initialize1 = function (this: UserRef) {
      return logs.push('after_initialize1 : ' + this.name);
    };
    User.afterInitialize(function (this: UserRef) {
      return logs.push('after_initialize2 : ' + this.name);
    });
    const _user = new User({
      name: 'John Doe',
      age: 27,
    });
    expect(logs).to.eql(['after_initialize1 : John Doe', 'after_initialize2 : John Doe']);
  });

  it('callbacks for finding a record', async () => {
    const User = models.User as any;
    const logs: string[] = [];
    const users = await User.createBulk([
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ]);
    User.afterFind('after_find1');
    User.prototype.after_find1 = function (this: UserRef) {
      return logs.push('after_find1 : ' + this.name);
    };
    User.afterFind(function (this: UserRef) {
      return logs.push('after_find2 : ' + this.name);
    });
    User.afterInitialize('after_initialize1');
    User.prototype.after_initialize1 = function (this: UserRef) {
      return logs.push('after_initialize1 : ' + this.name);
    };
    User.afterInitialize(function (this: UserRef) {
      return logs.push('after_initialize2 : ' + this.name);
    });
    await User.find(users[0].id);
    expect(logs).to.eql([
      'after_find1 : John Doe',
      'after_find2 : John Doe',
      'after_initialize1 : John Doe',
      'after_initialize2 : John Doe',
    ]);
  });

  it('callbacks for finding records', async () => {
    const User = models.User as any;
    await models.User.create({ name: 'John Doe', age: 27 });
    await models.User.create({ name: 'Bill Smith', age: 45 });
    await models.User.create({ name: 'Alice Jackson', age: 27 });
    const logs: string[] = [];
    User.afterFind('after_find1');
    User.prototype.after_find1 = function (this: UserRef) {
      return logs.push('after_find1 : ' + this.name);
    };
    User.afterFind(function (this: UserRef) {
      return logs.push('after_find2 : ' + this.name);
    });
    User.afterInitialize('after_initialize1');
    User.prototype.after_initialize1 = function (this: UserRef) {
      return logs.push('after_initialize1 : ' + this.name);
    };
    User.afterInitialize(function (this: UserRef) {
      return logs.push('after_initialize2 : ' + this.name);
    });
    await User.where({
      age: 27,
    });
    expect(logs).to.eql([
      'after_find1 : John Doe',
      'after_find2 : John Doe',
      'after_initialize1 : John Doe',
      'after_initialize2 : John Doe',
      'after_find1 : Alice Jackson',
      'after_find2 : Alice Jackson',
      'after_initialize1 : Alice Jackson',
      'after_initialize2 : Alice Jackson',
    ]);
  });

  it('callbacks for creating a record', async () => {
    const User = models.User as any;
    User.beforeValidate('before_validate1');
    const logs: string[] = [];
    User.prototype.before_validate1 = function (this: UserRef) {
      return logs.push('before_validate1 : ' + this.name);
    };
    User.beforeValidate(function (this: UserRef) {
      return logs.push('before_validate2 : ' + this.name);
    });
    User.afterValidate('after_validate1');
    User.prototype.after_validate1 = function (this: UserRef) {
      return logs.push('after_validate1 : ' + this.name);
    };
    User.afterValidate(function (this: UserRef) {
      return logs.push('after_validate2 : ' + this.name);
    });
    User.beforeSave('before_save1');
    User.prototype.before_save1 = function (this: UserRef) {
      return logs.push('before_save1 : ' + this.name);
    };
    User.beforeSave(function (this: UserRef) {
      return logs.push('before_save2 : ' + this.name);
    });
    User.afterSave('after_save1');
    User.prototype.after_save1 = function (this: UserRef) {
      return logs.push('after_save1 : ' + this.name);
    };
    User.afterSave(function (this: UserRef) {
      return logs.push('after_save2 : ' + this.name);
    });
    User.beforeCreate('before_create1');
    User.prototype.before_create1 = function (this: UserRef) {
      return logs.push('before_create1 : ' + this.name);
    };
    User.beforeCreate(function (this: UserRef) {
      return logs.push('before_create2 : ' + this.name);
    });
    User.afterCreate('after_create1');
    User.prototype.after_create1 = function (this: UserRef) {
      return logs.push('after_create1 : ' + this.name);
    };
    User.afterCreate(function (this: UserRef) {
      return logs.push('after_create2 : ' + this.name);
    });
    User.beforeUpdate('before_update1');
    User.prototype.before_update1 = function (this: UserRef) {
      return logs.push('before_update1 : ' + this.name);
    };
    User.beforeUpdate(function (this: UserRef) {
      return logs.push('before_update2 : ' + this.name);
    });
    User.afterUpdate('after_update1');
    User.prototype.after_update1 = function (this: UserRef) {
      return logs.push('after_update1 : ' + this.name);
    };
    User.afterUpdate(function (this: UserRef) {
      return logs.push('after_update2 : ' + this.name);
    });
    await User.create({
      name: 'John Doe',
      age: 27,
    });
    expect(logs).to.eql([
      'before_validate1 : John Doe',
      'before_validate2 : John Doe',
      'after_validate1 : John Doe',
      'after_validate2 : John Doe',
      'before_save1 : John Doe',
      'before_save2 : John Doe',
      'before_create1 : John Doe',
      'before_create2 : John Doe',
      'after_create1 : John Doe',
      'after_create2 : John Doe',
      'after_save1 : John Doe',
      'after_save2 : John Doe',
    ]);
  });

  it('callbacks for updating a record', async () => {
    const User = models.User as any;
    const user = await User.create({
      name: 'John Doe',
      age: 27,
    });
    const logs: string[] = [];
    User.beforeValidate('before_validate1');
    User.prototype.before_validate1 = function (this: UserRef) {
      return logs.push('before_validate1 : ' + this.name);
    };
    User.beforeValidate(function (this: UserRef) {
      return logs.push('before_validate2 : ' + this.name);
    });
    User.afterValidate('after_validate1');
    User.prototype.after_validate1 = function (this: UserRef) {
      return logs.push('after_validate1 : ' + this.name);
    };
    User.afterValidate(function (this: UserRef) {
      return logs.push('after_validate2 : ' + this.name);
    });
    User.beforeSave('before_save1');
    User.prototype.before_save1 = function (this: UserRef) {
      return logs.push('before_save1 : ' + this.name);
    };
    User.beforeSave(function (this: UserRef) {
      return logs.push('before_save2 : ' + this.name);
    });
    User.afterSave('after_save1');
    User.prototype.after_save1 = function (this: UserRef) {
      return logs.push('after_save1 : ' + this.name);
    };
    User.afterSave(function (this: UserRef) {
      return logs.push('after_save2 : ' + this.name);
    });
    User.beforeCreate('before_create1');
    User.prototype.before_create1 = function (this: UserRef) {
      return logs.push('before_create1 : ' + this.name);
    };
    User.beforeCreate(function (this: UserRef) {
      return logs.push('before_create2 : ' + this.name);
    });
    User.afterCreate('after_create1');
    User.prototype.after_create1 = function (this: UserRef) {
      return logs.push('after_create1 : ' + this.name);
    };
    User.afterCreate(function (this: UserRef) {
      return logs.push('after_create2 : ' + this.name);
    });
    User.beforeUpdate('before_update1');
    User.prototype.before_update1 = function (this: UserRef) {
      return logs.push('before_update1 : ' + this.name);
    };
    User.beforeUpdate(function (this: UserRef) {
      return logs.push('before_update2 : ' + this.name);
    });
    User.afterUpdate('after_update1');
    User.prototype.after_update1 = function (this: UserRef) {
      return logs.push('after_update1 : ' + this.name);
    };
    User.afterUpdate(function (this: UserRef) {
      return logs.push('after_update2 : ' + this.name);
    });
    user.name = 'Alice Jackson';
    await user.save();
    expect(logs).to.eql([
      'before_validate1 : Alice Jackson',
      'before_validate2 : Alice Jackson',
      'after_validate1 : Alice Jackson',
      'after_validate2 : Alice Jackson',
      'before_save1 : Alice Jackson',
      'before_save2 : Alice Jackson',
      'before_update1 : Alice Jackson',
      'before_update2 : Alice Jackson',
      'after_update1 : Alice Jackson',
      'after_update2 : Alice Jackson',
      'after_save1 : Alice Jackson',
      'after_save2 : Alice Jackson',
    ]);
  });

  it('callbacks for destroying a record', async () => {
    let logs: string[] = [];
    const User = models.User as any;
    User.beforeDestroy('before_destroy1');
    User.prototype.before_destroy1 = function (this: UserRef) {
      return logs.push('before_destroy1 : ' + this.name);
    };
    User.beforeDestroy(function (this: UserRef) {
      return logs.push('before_destroy2 : ' + this.name);
    });
    User.afterDestroy('after_destroy1');
    User.prototype.after_destroy1 = function (this: UserRef) {
      return logs.push('after_destroy1 : ' + this.name);
    };
    User.afterDestroy(function (this: UserRef) {
      return logs.push('after_destroy2 : ' + this.name);
    });
    let user = new User({ name: 'John Doe', age: 27 });
    await user.destroy();
    expect(logs).to.eql([
      'before_destroy1 : John Doe',
      'before_destroy2 : John Doe',
      'after_destroy1 : John Doe',
      'after_destroy2 : John Doe',
    ]);
    user = await User.create({
      name: 'John Doe',
      age: 27,
    });
    logs = [];
    await user.destroy();
    expect(logs).to.eql([
      'before_destroy1 : John Doe',
      'before_destroy2 : John Doe',
      'after_destroy1 : John Doe',
      'after_destroy2 : John Doe',
    ]);
  });
}
