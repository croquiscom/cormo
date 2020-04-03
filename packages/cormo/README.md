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

See https://github.com/croquiscom/cormo/wiki/Future-Plans for future plans.

# Overview

You can see detail guides on http://croquiscom.github.io/cormo/.

## Define models

```typescript
import * as cormo from 'cormo';

const connection = new cormo.Connection('mysql', { database: 'test' });

// this will create two tables - users, posts - in the database.

@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column({ type: String })
  name?: string;

  @cormo.Column({ type: cormo.types.Integer })
  age?: number;
}

@cormo.Model({ connection }) // set connection explictly
class Post extends cormo.BaseModel {
  @cormo.Column(String) // `String` is the same as `type: String`
  title?: string;

  @cormo.Column('string') // you can also use `string` to specify a string type
  body?: string;

  @cormo.Column(Date)
  date?: Date;

  @cormo.ObjectColumn({type: Author}) // You can delcare a nested column with `ObjectColumn` type
  author: Author;
}

class Auther extends User {
  @cormo.Column(Date)
  date_joined? Date;
}
```
```javascript
const cormo = require('cormo');
const connection = new cormo.Connection('mysql', { database: 'test' });

// this will create two tables - users, posts - in the database.

const User = connection.model('User', {
  name: { type: String },
  age: { type: cormo.types.Integer }
});

const Post = connection.model('Post', {
  title: String, // `String` is the same as `type: String`
  body: 'string', // you can also use `string` to specify a string type
  date: Date,
});

```
```coffeescript
cormo = require 'cormo'
connection = new cormo.Connection 'mysql', database: 'test'

# this will create two tables - users, posts - in the database.

class User extends cormo.BaseModel
  @column 'name', type: String
  @column 'age', type: cormo.types.Integer

class Post extends cormo.BaseModel
  @column 'title', String # `String` is the same as `type: String`
  @column 'body', 'string' # you can also use `string` to specify a string type
  @column 'date', Date
```

## Create records

```typescript
const user1 = new User({ name: 'John Doe', age: 27 });
await user1.save();

const user2 = await User.create({ name: 'John Doe', age: 27 });
```
```javascript
const user1 = new User({ name: 'John Doe', age: 27 });
await user1.save();

const user2 = await User.create({ name: 'John Doe', age: 27 });
```
```coffeescript
user1 = new User name: 'John Doe', age: 27
await user1.save()

user2 = await User.create name: 'John Doe', age: 27
```

## Retreive records

```typescript
const user = await User.find(1);

const users = await User.where({name: 'John Doe'});

const users = await User.where({age: 27})
  .select(['name'])
  .order('name')
  .limit(5)
  .skip(100);

const users = await User.where({$or: [ { age: { $lt: 20 } }, { age: { $gt: 60 } } ]})
  .where({name: { $contains: 'smi' }});

const posts = await Post.where({
  title: 'Lorem ipsum',
  'author.name': 'John Doe',
});

```
```javascript
const user = await User.find(1);

const users = await User.where({name: 'John Doe'});

const users = await User.where({age: 27})
  .select(['name'])
  .order('name')
  .limit(5)
  .skip(100);

const users = await User.where({$or: [ { age: { $lt: 20 } }, { age: { $gt: 60 } } ]})
  .where({name: { $contains: 'smi' }});
```
```coffeescript
user = await User.find 1

users = await User.where name: 'John Doe'

users = await await User.where(age: 27)
  .select(['name'])
  .order('name')
  .limit(5)
  .skip(100)

users = await User.where($or: [ { age: $lt: 20 }, { age: $gt: 60 } ])
  .where(name: $contains: 'smi')
```

## Count records

```typescript
const count = await User.count();

const count = await User.count({age: 27});
```
```javascript
const count = await User.count();

const count = await User.count({age: 27});
```
```coffeescript
count = await User.count()

count = await User.count age: 27
```

## Update records

```typescript
const user = await User.find(1);
user.age = 30;
await user.save();

const count = await User.find(1).update({age: 10});

const count = await User.where({age: 27}).update({age: 10});

const count = await User.where({age: 35}).update({age: {$inc: 3}});

const posts = await Post.where({title: 'Lorem Ipsum'}).update({ author: {age: {$inc: 5}}});
```
```javascript
const user = await User.find(1);
user.age = 30;
await user.save();

const count = await User.find(1).update({age: 10});

const count = await User.where({age: 27}).update({age: 10});

const count = await User.where({age: 35}).update({age: {$inc: 3}});
```
```coffeescript
user = await User.find 1
user.age = 30
await user.save()

count = await User.find(1).update age: 10

count = await User.where(age: 27).update age: 10

count = await User.where(age: 35).update age: $inc: 3
```

## Delete records

```typescript
const count = await User.delete({age: 27});
```
```javascript
const count = await User.delete({age: 27});
```
```coffeescript
count = await User.delete age: 27
```

## Constraint

```typescript
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column({ type: String, required: true })
  name!: string;

  @cormo.Column({ type: Number, required: true })
  age!: number;

  @cormo.Column({ type: String, unique: true, required: true })
  email!: string;
}
```
```javascript
const User = connection.model('User', {
  name: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, unique: true, required: true }
});
```
```coffeescript
class User extends cormo.BaseModel
  @column 'name', type: String, required: true
  @column 'age', type: Number, required: true
  @column 'email', type: String, unique: true, required: true
```

## Validation

```typescript
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(Number)
  age?: number;

  @cormo.Column(String)
  email?: string;
}

User.addValidator((record) => {
  if (record.age<18) {
    return 'too young';
  }
});
```
```javascript
const User = connection.model('User', {
  name: String,
  age: Number,
  email: String
});

User.addValidator((record) => {
  if (record.age<18) {
    return 'too young';
  }
});
```
```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number
  @column 'email', String

  @addValidator (record) ->
    if record.age < 18
      return 'too young'
```

## Callbacks

```typescript
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(Number)
  age?: number;
}

User.beforeSave(() => {
  this.name = this.name.trim();
});
```
```javascript
const User = connection.model('User', {
  name: String,
  age: Number
});

User.beforeSave(() => {
  this.name = this.name.trim();
});
```
```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number

  @beforeSave ->
    @name = @name.trim()
```

## Associations

```typescript
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(Number)
  age?: number;

  @cormo.HasMany()
  posts?: Post[];
}

@cormo.Model()
class Post extends cormo.BaseModel {
  @cormo.Column(String)
  title?: string;

  @cormo.Column(String)
  body?: string;

  @cormo.BelongsTo()
  user?: User;
}
```
```javascript
var User = connection.model('User', {
  name: String,
  age: Number
});

var Post = connection.model('Post', {
  title: String,
  body: String
});

User.hasMany(Post);
Post.belongsTo(User);
```
```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number
  @hasMany 'posts'

class Post extends cormo.BaseModel
  @column 'title', String
  @column 'body', String
  @belongsTo 'user'
```

## Aggregation

```typescript
const records = await Order.where({price: {$lt: 10}})
  .group(null, {count: {$sum: 1}, total: {$sum: '$price'}})
  .order('total');

const records = await Order.group('customer', {min_price: {$min: '$price'}, max_price: {$max: '$price'}});
```
```javascript
const records = await Order.where({price: {$lt: 10}})
  .group(null, {count: {$sum: 1}, total: {$sum: '$price'}})
  .order('total');

const records = await Order.group('customer', {min_price: {$min: '$price'}, max_price: {$max: '$price'}});
```
```coffeescript
records = await Order.where price: $lt: 10
  .group null, count: {$sum: 1}, total: {$sum: '$price'}
  .order 'total'

records = await Order.group 'customer', min_price: { $min: '$price' }, max_price: { $max: '$price' }
```

## Geospatial query

```typescript
@cormo.Model()
class Place extends cormo.BaseModel {
  @cormo.Column(String)
  name?: string;

  @cormo.Column(cormo.types.GeoPoint)
  location?: [number, number];
}

// create
await Place.create({name: 'Carrier Dome', location: [-76.136131, 43.036240]});

// query
const places = await Place.query().near({location: [-5, 45]}).limit(4);
console.log(places);
```
```javascript
const Place = connection.model('Place', {
  name: String,
  location: cormo.types.GeoPoint
});

// create
await Place.create({name: 'Carrier Dome', location: [-76.136131, 43.036240]});

// query
const places = await Place.query().near({location: [-5, 45]}).limit(4);
console.log(places);
```
```coffeescript
class Place extends cormo.BaseModel
  @column 'name', String
  @column 'location', cormo.types.GeoPoint

# create
await Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

# query
places = await Place.query().near(location: [-5, 45]).limit(4)
console.log places
```

# License

MIT licenses. See [LICENSE](https://github.com/croquiscom/cormo/blob/master/packages/cormo/LICENSE) for more details.
