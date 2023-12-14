CORMO는 Node.js를 위한 ORM 프레임워크입니다.

현재 다음과 같은 기능을 제공합니다.

- 다양한 DB: MySQL, MongoDB, SQLite3, PostgreSQL
- 제약(constraints)
- 유효성 검사(validations)
- 관계(associations)
- 지리공간 질의(geospatial query)
- 콜백(callbacks)
- 집합(aggregation)
- 중첩 컬럼(nested column)
- 트랜잭션(transactions)
- 스키마 마이그레이션(schema migration)

## 설치

CORMO 모듈과 사용하려는 데이터베이스를 위한 드라이버를 설치합니다.
(MySQL은 [mysql2](https://www.npmjs.com/package/mysql2) 또는 [mysql](https://www.npmjs.com/package/mysql), MongoDB는 [mongodb](https://www.npmjs.com/package/mongodb), SQLite3는 [sqlite3](https://www.npmjs.com/package/sqlite3), PostgreSQL는 [pg](https://www.npmjs.com/package/pg))

```bash
$ npm install cormo mysql
```

## 기본 구성

다음과 같이 DB 연결과 모델을 정의할 수 있습니다.

```typescript
import * as cormo from 'cormo';

const connection = new cormo.MySQLConnection({ database: 'test' });

@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column({ type: String })
  name?: string;

  @cormo.Column({ type: cormo.types.Integer })
  age?: number;
}
```
