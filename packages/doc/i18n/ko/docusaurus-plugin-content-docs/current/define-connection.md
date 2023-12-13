모델을 정의하기에 앞서 데이터베이스로의 [연결](/cormo/api/cormo/classes/connection.html)을 생성해야 합니다.

```typescript
import * as cormo from 'cormo';

const connection = new cormo.MySQLConnection({ database: 'test' });
```

각 데이터베이스 시스템별 설정은
[MySQLConnectionSettings](/cormo/api/cormo/interfaces/mysqlconnectionsettings.html), [MongoDBConnectionSettings](/cormo/api/cormo/interfaces/mongodbconnectionsettings.html), [SQLite3ConnectionSettings](/cormo/api/cormo/interfaces/sqlite3connectionsettings.html), [PostgreSQLConnectionSettings](/cormo/api/cormo/interfaces/postgresqlconnectionsettings.html)에서 확인할 수 있습니다.

각 데이터베이스 시스템에 맞는 드라이버(MySQL은 [mysql2](https://www.npmjs.com/package/mysql2) 또는 [mysql](https://www.npmjs.com/package/mysql), MongoDB는 [mongodb](https://www.npmjs.com/package/mongodb), SQLite3는 [sqlite3](https://www.npmjs.com/package/sqlite3), PostgreSQL는 [pg](https://www.npmjs.com/package/pg))를 설치해야 합니다. 그렇지 않으면 `Install mysql module to use this adapter`와 같은 에러와 함께 프로세스가 종료됩니다.

런타임에 환경별로 다른 데이터베이스 시스템을 사용하는 경우 [Connection](/cormo/api/cormo/classes/connection.html) 클래스를 직접 사용합니다.

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

모델을 정의하면, 모델은 자동으로 마지막 Connection 인스턴스에 연결됩니다. 자동 연결을 원하지 않는 경우 (예. 다수의 커넥션을 사용) is_default를 false로 설정합니다.

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

Connection 인스턴스는 어떤 메소드 호출이 없어도 데이터베이스 서버에 자동으로 연결합니다.
