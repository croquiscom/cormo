import * as cormo from '../..';

let db_configs: { [db: string]: any };
if (process.env.TRAVIS === 'true') {
  db_configs = {
    mongodb: {
      implicit_apply_schemas: true,
      database: 'travis',
    },
    mysql: {
      implicit_apply_schemas: true,
      database: 'travis',
      user: 'travis',
    },
    postgresql: {
      implicit_apply_schemas: true,
      database: 'travis_ci_test',
      user: 'postgres',
    },
    redis: {
      implicit_apply_schemas: true,
      database: 1,
    },
    sqlite3: {
      implicit_apply_schemas: true,
      database: __dirname + '/test.sqlite3',
    },
    sqlite3_memory: {
      implicit_apply_schemas: true,
    },
  };
} else {
  db_configs = {
    mongodb: {
      implicit_apply_schemas: true,
      database: 'test',
      port: 21861,
      redis_cache: {
        port: 21863,
      },
    },
    mysql: {
      implicit_apply_schemas: true,
      database: 'cormo_test',
      password: 'cormo_test',
      port: 21860,
      redis_cache: {
        port: 21863,
      },
      user: 'cormo_test',
    },
    postgresql: {
      implicit_apply_schemas: true,
      database: 'cormo_test',
      password: 'cormo_test',
      port: 21862,
      redis_cache: {
        port: 21863,
      },
      user: 'cormo_test',
    },
    redis: {
      implicit_apply_schemas: true,
      database: 1,
      port: 21863,
      redis_cache: {
        port: 21863,
      },
    },
    sqlite3: {
      implicit_apply_schemas: true,
      database: __dirname + '/test.sqlite3',
      redis_cache: {
        port: 21863,
      },
    },
    sqlite3_memory: {
      implicit_apply_schemas: true,
      redis_cache: {
        port: 21863,
      },
    },
  };
}

async function deleteAllRecords(models: typeof cormo.BaseModel[]) {
  await _g.connection!.applySchemas();
  for (const model of models) {
    if (!model) {
      continue;
    }
    const archive = model.archive;
    model.archive = false;
    await model.deleteAll();
    model.archive = archive;
  }
}

const _g = {
  BaseModel: cormo.BaseModel,
  Connection: cormo.Connection,
  connection: null as cormo.Connection | null,
  cormo,
  db_configs,
  deleteAllRecords,
  // whether define models using CoffeeScript extends keyword or Connection::model
  use_class: Math.floor(Math.random() * 2) !== 0,
};

if (process.env.DIRTY_TRACKING) {
  _g.BaseModel.dirty_tracking = process.env.DIRTY_TRACKING === 'true';
} else {
  _g.BaseModel.dirty_tracking = Math.floor(Math.random() * 2) !== 0;
}

console.log(`Run test with dirty_tracking=${_g.BaseModel.dirty_tracking}`);

export = _g;
