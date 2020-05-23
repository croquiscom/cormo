---
id: define-models
title: Define Models
---

You can define Models by extending [BaseModel](/cormo/api/cormo/classes/basemodel.html), or using [Connection#models](/cormo/api/cormo/classes/connection.html#models).

```typescript
class User extends cormo.BaseModel {
  name?: string;
  age?: number;
}

User.column('name', String);
User.column('age', cormo.types.Integer);

// or if you don't want to use class keyword
const User = connection.model('User', {
  name: String,
  age: cormo.types.Integer,
});

// or if you want to use TypeScript decorators
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(cormo.types.Integer)
  age?: number;
}
```

You can pass an object with type property instead of a type class.
Use this form to give additional options.

```typescript
User.column('name', { type: String, required: true });
User.column('age', { type: cormo.types.Integer, description: 'age of the user' });
```

## types

You can use any of CORMO type classes(e.g. cormo.types.String), strings(e.g. `'string'`), or native JavaScript Function(e.g. String) to specify a type.

Currently supported types:

* [types.String](/cormo/api/cormo/interfaces/cormotypesstring.html) ('string', String)
* [types.Number](/cormo/api/cormo/interfaces/cormotypesnumber.html) ('number', Number)
* [types.Boolean](/cormo/api/cormo/interfaces/cormotypesboolean.html) ('boolean', Boolean)
* [types.Integer](/cormo/api/cormo/interfaces/cormotypesinteger.html) ('integer')
* [types.Date](/cormo/api/cormo/interfaces/cormotypesdate.html) ('date', Date)
* [types.GeoPoint](/cormo/api/cormo/interfaces/cormotypesgeopoint.html) ('geopoint')
    * MySQL, MonogoDB, PostgreSQL only
* [types.Object](/cormo/api/cormo/interfaces/cormotypesobject.html) ('object', Object)
    * Objects are stored as a JSON string in SQL adapters.
* [types.Text](/cormo/api/cormo/interfaces/cormotypestext.html) ('text')
    * Use for long string content in SQL adapters.

### type options

You can give options for types in some adapters.

To specify length for string type in MySQL or PostgreSQL, you should do

```typescript
Model.column('method_1', cormo.types.String(50))
// or
Model.column('method_2', 'string(50)')
```

Please note that you must use `cormo.types.String`, not `String`.
