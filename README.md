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

class User extends cormo.Model
  @column 'name', type: String
  @column 'age', type: cormo.types.Integer

class Post extends cormo.Model
  @column 'title', String # `String` is the same as `type: String`
  @column 'body', 'string' # you can also use `string` to specify a string type
  @column 'date', Date
```

## Create records

```coffeescript
user1 = new User name: 'John Doe', age: 27
user1.save (error) ->
  console.log error

User.create name: 'John Doe', age: 27, (error, user2) ->
  console.log error
```

# Usage

## Query

```coffeescript
# simple query
# the same as "SELECT * FROM users WHERE age=27"
User.where age: 27, (error, users) ->
  console.log users

# else you can use query chain
User.where(age: 27).exec (error, users) ->
  console.log users

# select partial columns
# the same as "SELECT name,age FROM users"
User.select 'name age', (error, users) ->
  console.log users

# sort result
# the same as "SELECT * FROM users ORDER BY age ASC, name DESC"
User.order 'age -name', (error, users) ->
  console.log users

# two condition
# the same as "SELECT * FROM users WHERE name='John Doe' AND age=27"
User.where name: 'John Doe', age: 27, (error, users) ->
  console.log users

# using query chain
User.where(name: 'John Doe').where(age: 27).exec (error, users) ->
  console.log users

# find by id, return a single record
User.find 1, (error, user) ->
  console.log user

# find multiple ids
# will return error unless records are found for all ids
User.find [1,2,3], (error, users) ->
  console.log users

# find multiple ids with same order
User.findPreserve [2,1,2,3], (error, users) ->
  # users[0].id is 2 and users[1].id is 1 and users[2].id is 2 and users[3].id is 3
  console.log users

# get count of all records
# the same as "SELECT COUNT(*) FROM users"
User.count (error, count) ->
  console.log count

# get count of matched records
# the same as "SELECT COUNT(*) FROM users WHERE age=27"
User.count age: 27, (error, count) ->
  console.log count

# update records that match conditions
# the same as "UPDATE users SET age=10 WHERE age=27"
User.update { age: 10 }, age: 27, (error, count) ->
  console.log count

# using query chain
User.where(age: 27).update age:10, (error, count) ->
  console.log count

# delete records that match conditions
# the same as "DELETE FROM users WHERE age=27"
User.delete age: 27, (error, count) ->
  console.log count

# or condition, similar syntax with MongoDB
# the same as "SELECT * FROM users WHERE name='John Doe' OR age=27"
User.where $or: [ { name: 'John Doe' }, { age: 27 } ], (error, users) ->
  console.log users

# comparison
# the same as "SELECT * FROM users WHERE age > 30 AND age <= 45"
User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ], (error, users) ->
  console.log users

# containing some text in case insensitive
# the same as "SELECT * FROM users WHERE name LIKE '%smi%'"
User.where { name: { $contains: 'smi' } }, (error, users) ->
  console.log users

# subset
# the same as "SELECT * FROM users WHERE age IN (10,20,30)"
User.where { age: { $in: [ 10, 20, 30 ] } }, (error, users) ->
  console.log users

# you can omit the $in keyword (implicit $in)
User.where { age: [ 10, 20, 30 ] }, (error, users) ->
  console.log users

# limit records
# the same as "SELECT * FROM users WHERE age<40 LIMIT 3"
User.where(age: { $lt: 40 }).limit(3).exec (error, users) ->
  console.log users
```

See [[#ModelQuery]], [[#Query]] for more details.

## Constraints

Currently supports 'unique' and 'required'(not null).

'unique' is supported on the database layer.
'required' is supported on the CORMO layer(while validating).

The column unique but not required can have multiple null values.

```coffeescript
User = connection.model 'User',
  name: { type: String, required: true }
  age: { type: Number, required: true }
  email: { type: String, unique: true, required: true }

User.create { name: 'Bill Smith', age: 45, email: 'bill@foo.org' }, (error, user1) ->
  User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, (error, user2) ->
    # error.message will be 'duplicated email' or 'duplicated'
```

See [[#Connection::model]] for more details.

## Validations

If you want validations, adds a validator using [[#ModelValidate.addValidator]].

If a record is invalid, throws an error, or returns false or an error string in the validator.

```coffeescript
User = models.User = connection.model 'User',
  name: String
  age: Number
  email: String

# checkes age validity
User.addValidator (record) ->
  if record.age < 18
    return 'too young'
  
# checkes email validity
User.addValidator (record) ->
  if record.email and not /^\w+@.+$/.test record.email
    throw new Error 'invalid email'
  return true

User.create { name: 'John Doe', age: 10, email: 'invalid' }, (error, user) ->
  # error.message will be 'invalid email,too young' or 'too young,invalid email'
```

See [[#ModelValidate.addValidator]] for more details.

## Callbacks

CORMO supports following callbacks:

* afterInitialize
* afterFind
* beforeValidate
* afterValidate
* beforeSave
* afterSave
* beforeCreate
* afterCreate
* beforeUpdate
* afterUpdate
* beforeDestroy
* afterDestroy

```coffeescript
# using method name
User.afterInitialize 'onAfterInitialie'
User::onAfterInitialie = ->
  console.log 'initialized'

# using anonymous function
User.afterCreate ->
  console.log 'created'

# while defining a model
class Post extends cormo.Model
  @column 'title', String # 'String' is the same as '{ type: String }'
  @column 'body', 'string' # you can also use 'string' to specify a string type
  @afterSave 'onAfterSave'

  onAfterSave: ->
    console.log 'saved'
```

## Associations

```coffeescript
User = connection.model 'User',
  name: String
  age: Number

Post = connection.model 'Post',
  title: String
  body: String

# one-to-many association
# this will add 'user_id' to the Post model
User.hasMany Post
Post.belongsTo User

# one-to-many association with 'as'
# this will add 'parent_post_id' to the Post model
Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
Post.belongsTo Post, as: 'parent_post'

# get associated objects
user.posts (error, records) ->
  console.log records
post.user (error, record) ->
  console.log record
post.comments (error, records) ->
  console.log records
post.parent_post (error, record) ->
  console.log record

# returned objects are cached, give true to reload
user.posts true, (error, records) ->
  console.log records

# two ways to create an associated object
Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
  console.log post

post = user.posts.build title: 'first post', body: 'This is the 1st post.'
post.save (error) ->
  console.log error
```

See [[#Model.hasMany]], [[#Model.belongsTo]] for more details.

### keep data consistent

CORMO supports foreign key constraints by DBMS for SQL-based DBMS or by framework for MongoDB.
(CORMO does not guarantee integrity for MongoDB even if using this feature)

To use constraints, give an integrity options on [[#Model.hasMany]].

```coffeescript
# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL"
User.hasMany Post, integrity: 'nullify'

# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT"
User.hasMany Post, integrity: 'restrict'

# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
User.hasMany Post, integrity: 'delete'

# no option means no foreign key constraint
# so there may be a post with invalid user_id
User.hasMany Post
```

## Geospatial query

Currently, we supports only near query of 2D location in MongoDB and MySQL.

```coffeescript
Place = connection.model 'Place',
  name: String
  location: cormo.types.GeoPoint

# create 
Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

# query
Place.where().near(location: [-5, 45]).limit(4).exec (error, places) ->
  console.log places
```

See [[#Query::near]] for more details.

## Other features

Use [[#ModelTimestamp.timestamps]] to add created_at and updated_at to the table.

```coffeescript
User.timestamps()
```

If [[#Model.archive]] is true, deleted records are archived in the _Archive table.

```coffeescript
User.archive = true
User.delete age: 27, (error, count) ->
  # _Archive will have delete records as
  #   { model: 'User', data: <deleted user 1> },
  #   { model: 'User', data: <deleted user 2> }, ...
```

# License

The MIT License (MIT)

Copyright (c) 2012-2013 Sangmin Yoon &lt;sangmin.yoon@croquis.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
