[BaseModel](/cormo/api/cormo/classes/basemodel.html)을 상속받거나 [Connection#models](/cormo/api/cormo/classes/connection.html#models) 메소드를 사용해서 모델을 정의할 수 있습니다.

```typescript
class User extends cormo.BaseModel {
  name?: string;
  age?: number;
}

User.column('name', String);
User.column('age', cormo.types.Integer);

// class 키워드를 사용하고 싶지 않은 경우
const User = connection.model('User', {
  name: String,
  age: cormo.types.Integer,
});

// TypeScript 데코레이터를 사용하고 싶은 경우
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(cormo.types.Integer)
  age?: number;
}
```

타입 클래스 대신에 type 속성을 가진 객체를 넘길 수 있습니다.
추가 옵션이 필요한 경우 이 형태를 사용하면 됩니다.

```typescript
User.column('name', { type: String, required: true });
User.column('age', { type: cormo.types.Integer, description: '사용자의 나이' });
```

## 타입

타입을 지정하기 위해서 CORMO의 타입 클래스(예, cormo.types.String)나 문자열(예, `'string'`), 또는 JavaScript 기본 함수(예, String)를 사용할 수 있습니다.

현재 지원되는 타입은 다음과 같습니다.

- [types.String](/cormo/api/cormo/interfaces/cormotypesstring.html) ('string', String)
- [types.Number](/cormo/api/cormo/interfaces/cormotypesnumber.html) ('number', Number)
- [types.Boolean](/cormo/api/cormo/interfaces/cormotypesboolean.html) ('boolean', Boolean)
- [types.Integer](/cormo/api/cormo/interfaces/cormotypesinteger.html) ('integer')
- [types.Date](/cormo/api/cormo/interfaces/cormotypesdate.html) ('date', Date)
- [types.GeoPoint](/cormo/api/cormo/interfaces/cormotypesgeopoint.html) ('geopoint')
  - MySQL, MonogoDB, PostgreSQL 만 지원
- [types.Object](/cormo/api/cormo/interfaces/cormotypesobject.html) ('object', Object)
  - SQL 어댑터에서 객체는 JSON 문자열로 저장합니다.
- [types.Text](/cormo/api/cormo/interfaces/cormotypestext.html) ('text')
  - SQL 어댑터에서 긴 문자열을 저정할 때 사용합니다.

### 타입 옵션

일부 어댑터는 타입에 옵션을 줄 수 있습니다.

다음과 같이 하면 MySQL나 PostgreSQL에서 문자열 타입에 길이를 지정할 수 있습니다.

```typescript
Model.column('method_1', cormo.types.String(50));
// 또는
Model.column('method_2', 'string(50)');
```

`String`이 아니라 `cormo.types.String`을 사용해야 한다는 점에 주의 하십시오.
