import * as cormo from 'cormo';

let db_configs: { [db: string]: any };
if (process.env.TRAVIS === 'true') {
  db_configs = {
    mysql: {
      implicit_apply_schemas: true,
      database: 'travis',
      user: 'travis',
    },
  };
} else {
  db_configs = {
    mysql: {
      implicit_apply_schemas: true,
      database: 'cormo_test',
      password: 'cormo_test',
      port: 21860,
      user: 'cormo_test',
    },
  };
}

const _g = {
  db_configs,
};

export = _g;
