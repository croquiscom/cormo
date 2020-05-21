---
id: getting-started
title: Getting Started
---

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

## Installation

You should install the CORMO module and drivers for databases you want.
([mysql2](https://www.npmjs.com/package/mysql2) or [mysql](https://www.npmjs.com/package/mysql) for MySQL. [mongodb](https://www.npmjs.com/package/mongodb) for MongoDB. [sqlite3](https://www.npmjs.com/package/sqlite3) for SQLite3. [pg](https://www.npmjs.com/package/pg) for PostgreSQL.)

```bash
$ npm install cormo mysql
```

## Setup

Define a connection and models like this:

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
