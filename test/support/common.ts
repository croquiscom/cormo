import * as cormo from '../..';

let db_configs: { [db: string]: any };
if (process.env.TRAVIS === 'true') {
  db_configs = {
    mongodb: {
      database: 'travis',
    },
    mysql: {
      database: 'travis',
      user: 'travis',
    },
    postgresql: {
      database: 'travis_ci_test',
      user: 'postgres',
    },
    redis: {
      database: 1,
    },
    sqlite3: {
      database: __dirname + '/test.sqlite3',
    },
    sqlite3_memory: {},
  };
} else {
  db_configs = {
    mongodb: {
      database: 'test',
      port: 21861,
      redis_cache: {
        port: 21863,
      },
    },
    mysql: {
      database: 'cormo_test',
      password: 'cormo_test',
      port: 21860,
      redis_cache: {
        port: 21863,
      },
      user: 'cormo_test',
    },
    postgresql: {
      database: 'cormo_test',
      password: 'cormo_test',
      port: 21862,
      redis_cache: {
        port: 21863,
      },
      user: 'cormo_test',
    },
    redis: {
      database: 1,
      port: 21863,
      redis_cache: {
        port: 21863,
      },
    },
    sqlite3: {
      database: __dirname + '/test.sqlite3',
      redis_cache: {
        port: 21863,
      },
    },
    sqlite3_memory: {
      redis_cache: {
        port: 21863,
      },
    },
  };
}

async function deleteAllRecords(models: any[]) {
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
