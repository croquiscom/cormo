---
id: define-connection
title: Define Connection
---

Before define models, you should create a [Connection](/cormo/api/cormo/classes/connection.html) to the database.

```typescript
import * as cormo from 'cormo';

const connection = new cormo.MySQLConnection({ database: 'test' });
```

You can see allowed settings for each database system at
[MySQLConnectionSettings](/cormo/api/cormo/interfaces/mysqlconnectionsettings.html), [MongoDBConnectionSettings](/cormo/api/cormo/interfaces/mongodbconnectionsettings.html), [SQLite3ConnectionSettings](/cormo/api/cormo/interfaces/sqlite3connectionsettings.html) and [PostgreSQLConnectionSettings](/cormo/api/cormo/interfaces/postgresqlconnectionsettings.html).

You must install a driver([mysql2](https://www.npmjs.com/package/mysql2) or [mysql](https://www.npmjs.com/package/mysql) for MySQL. [mongodb](https://www.npmjs.com/package/mongodb) for MongoDB. [sqlite3](https://www.npmjs.com/package/sqlite3) for SQLite3. [pg](https://www.npmjs.com/package/pg) for PostgreSQL.) for the database system. Otherwise you will see an error like `Install mysql module to use this adapter` and process will be terminated.

If you want to select different database system at runtime according to the environment, use [Connection](/cormo/api/cormo/classes/connection.html) class directly.

```typescript
let Config;
if (process.env.NODE_ENV === 'test') {
  Config = {
    database_type: 'sqlite3',
    database_settings: {
      database: __dirname + '/test.sqlite3',
    },
  };
} else {
  Config = {
    database_type: 'mysql',
    database_settings: {
      host: 'db.example.com',
      database: 'cormo',
    },
  };
}
const connection = new cormo.Connection(Config.database_type, Config.database_settings);
```

If you define models, they will be connected the last Connection instance automatically. If you don't want this behavior (e.g use multiple connections), set is_default to false.

```typescript
const mysql = new cormo.MySQLConnection({ database: 'test', is_default: false });
const mongodb = new cormo.MongoDBConnection({ database: 'test', is_default: false });

@cormo.Model({ connection: mongodb })
class User extends cormo.BaseModel {
  @cormo.Column(String)
  public name?: string | null;

  @cormo.Column(Number)
  public age?: number | null;
}

@cormo.Model({ connection: mysql })
class Post extends cormo.BaseModel {
  @cormo.Column(String)
  public title?: string | null;

  @cormo.Column(String)
  public body?: string | null;
}
```

The Connection instance will connect the database server automatically without any method call.
