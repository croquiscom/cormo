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
```javascript
var cormo = require('cormo');
var connection = new cormo.Connection('mysql', { database: 'test' });

// this will create two tables - users, posts - in the database.

var User = connection.model('User', {
  name: { type: String },
  age: { type: cormo.types.Integer }
});

var Post = connection.model('Post', {
  title: String, // `String` is the same as `type: String`
  body: 'string', // you can also use `string` to specify a string type
  date: Date
});
```

## Create records

```coffeescript
user1 = new User name: 'John Doe', age: 27
user1.save (error) ->
  console.log error

User.create name: 'John Doe', age: 27, (error, user2) ->
  console.log error
```
```javascript
var user1 = new User({name: 'John Doe', age: 27});
user1.save(function (error) {
  console.log(error);
});

User.create({name: 'John Doe', age: 27}, function (error, user2) {
  console.log(error);
});
```

## Retreive records

```coffeescript
User.find 1, (error, user) ->

User.where name: 'John Doe', (error, users) ->

User.where(age: 27)
.select('name')
.order('name')
.limit(5)
.skip(100)
.exec (error, users) ->

User.where($or: [ { age: $lt: 20 }, { age: $gt: 60 } ])
.where(name: $contains: 'smi')
.exec (error, users) ->
```
```javascript
User.find(1, function (error, user) {
});

User.where({name: 'John Doe'}, function (error, users) {
});

User.where({age: 27})
.select('name')
.order('name')
.limit(5)
.skip(100)
.exec(function (error, users) {
});

User.where({$or: [ { age: { $lt: 20 } }, { age: { $gt: 60 } } ]})
.where({name: { $contains: 'smi' }})
.exec(function (error, users) {
});
```

## Count records

```coffeescript
User.count (error, count) ->

User.count age: 27, (error, count) ->
```
```javascript
User.count(function (error, count) {
});

User.count({age: 27}, function (error, count) {
});
```

## Update records

```coffeescript
User.find 1, (error, user) ->
  user.age = 30
  user.save (error) ->

User.find(1).update age: 10, (error, count) ->

User.where(age: 27).update age: 10, (error, count) ->

User.where(age: 35).update age: $inc: 3, (error, count) ->
```
```javascript
User.find(1, function (error, user) {
  user.age = 30;
  user.save(function (error) {
  });
});

User.find(1).update({age: 10}, function (error, count) {
});

User.where({age: 27}).update({age: 10}, function (error, count) {
});

User.where({age: 35}).update({age: {$inc: 3}}, function (error, count) {
});
```

## Delete records

```coffeescript
User.delete age: 27, (error, count) ->
```
```javascript
User.delete({age: 27}, function (error, count) {
});
```

## Constraint

```coffeescript
class User extends cormo.BaseModel
  @column 'name', type: String, required: true
  @column 'age', type: Number, required: true
  @column 'email', type: String, unique: true, required: true
```
```javascript
var User = connection.model('User', {
  name: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, unique: true, required: true }
});
```

## Validation

```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number
  @column 'email', String

  @addValidator (record) ->
    if record.age < 18
      return 'too young'
```
```javascript
var User = connection.model('User', {
  name: String,
  age: Number,
  email: String
});

User.addValidator(function (record) {
  if (record.age<18) {
    return 'too young';
  }
});
```

## Callbacks

```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number

  @beforeSave ->
    @name = @name.trim()
```
```javascript
var User = connection.model('User', {
  name: String,
  age: Number
});

User.beforeSave(function () {
  this.name = this.name.trim();
});
```

## Associations

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

## Aggregation

```coffeescript
Order.where price: $lt: 10
.group null, count: {$sum: 1}, total: {$sum: '$price'}
.order 'total'
.exec (error, records) ->

Order.group 'customer', min_price: { $min: '$price' }, max_price: { $max: '$price' }
.exec (error, records) ->
```
```javascript
Order.where({price: {$lt: 10}})
.group(null, {count: {$sum: 1}, total: {$sum: '$price'}})
.order('total')
.exec(function (error, records) {
});

Order.group('customer', {min_price: {$min: '$price'}, max_price: {$max: '$price'}})
.exec(function (error, records) {
});
```

## Geospatial query

```coffeescript
class Place extends cormo.BaseModel
  @column 'name', String
  @column 'location', cormo.types.GeoPoint

# create
Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

# query
Place.query().near(location: [-5, 45]).limit(4).exec (error, places) ->
  console.log places
```
```javascript
var Place = connection.model('Place', {
  name: String,
  location: cormo.types.GeoPoint
});

// create
Place.create({name: 'Carrier Dome', location: [-76.136131, 43.036240]});

// query
Place.query().near({location: [-5, 45]}).limit(4).exec(function (error, places) {
  console.log(places);
});
```

# License

MIT licenses. See [LICENSE](https://github.com/croquiscom/cormo/blob/master/LICENSE) for more details.
