const db_configs: { [db: string]: any } = {
  mysql: {
    implicit_apply_schemas: true,
    database: 'cormo_test',
    password: 'cormo_test',
    port: 21860,
    user: 'cormo_test',
  },
};

const _g = {
  db_configs,
};

export = _g;
