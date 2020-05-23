[![npm version](https://badge.fury.io/js/cormo.svg)](http://badge.fury.io/js/cormo)
[![Build Status](https://travis-ci.org/croquiscom/cormo.svg?branch=master)](https://travis-ci.org/croquiscom/cormo)

# About

CORMO is an ORM framework for Node.js.

Currently supports:

* multi-DB: MySQL, MongoDB, SQLite3, PostgreSQL
* constraints
* validations
* associations
* geospatial query
* callbacks
* aggregation
* nested column
* transactions
* schema migration

See https://github.com/croquiscom/cormo/wiki/Future-Plans for future plans.

# Overview

The following is a basic usage.
You can see detail guides on http://croquiscom.github.io/cormo/.

```typescript
import * as cormo from 'cormo';

const connection = new cormo.MySQLConnection({ database: 'test' });

@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column({ type: String, required: true, unique: true })
  name!: string;

  @cormo.Column({ type: cormo.types.Integer })
  age?: number;
}

await User.create({ name: 'John Doe', age: 27 });

const users = await User.where({age: 27})
  .select(['name'])
  .order('name')
  .limit(5)
  .skip(100);
```

# License

MIT licenses. See [LICENSE](https://github.com/croquiscom/cormo/blob/master/packages/cormo/LICENSE) for more details.
