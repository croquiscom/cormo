# About

CORMO is an ORM framework for Node.js.

Currently supports:

* multi-DB: MySQL, MongoDB, SQLite3, PostgreSQL, Redis
* constraints
* validations
* associations
* geospatial query

Will support:

* auto table migration
* more DB, validations, associations, ...

This project is not yet stabilized.
API can be changed.

# Usage
## Connect to DB

```coffeescript
Connection = require('cormo').Connection

connection = new Connection 'mysql', database: 'test'

another = new Connection 'mongodb', database: 'test'
```

See documents for each adapter([[#AdapterBase]]) for detail options.

## Define models

```coffeescript
# this will create two tables - users, posts.

# using model method
User = connection.model 'User',
  name: { type: String }
  age: { type: Number }

# using CoffeeScript extends keyword
class Post extends cormo.Model
  @connection connection # if omitted, Connection.defaultConnection will be used instead
  @column 'title', String # 'String' is the same as '{ type: String }'
  @column 'body', 'string' # you can also use 'string' to specify a string type

# apply defined models to Database. This can be omitted
connection.applySchemas (error) ->
  console.log error
```

You can use any of cormo.types.String, 'string', or String
(native JavaScript Function, if exists) to specify a type.

Currently supported types:

* String
* Number
* Integer
* Date
* GeoPoint (MySQL, MonogoDB only)

See [[#Connection::model]], [[#Connection::applySchemas]] for more details.

## Create a record

```coffeescript
# new with no data
user1 = new User()
user1.name = 'John Doe'
user1.age = 27
user1.save (error) ->
  console.log error

# new with data
user2 = new User name: 'John Doe', age: 27
user2.save (error) ->
  console.log error

# build is the same as new
user3 = User.build name: 'John Doe', age: 27
user3.save (error) ->
  console.log error

# create is the same as build and save
User.create { name: 'John Doe', age: 27 }, (error, user) ->
  console.log error
```

See [[#Model::constructor]], [[#ModelPersistence::save]], [[#Model.build]], [[#ModelPersistence.create]] for more details.

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

Use [[#ModelPersistence.createBulk]] to create many records at once.

```coffeescript
User.createBulk [ { name: 'John Doe', age: 27 }, { name: 'Bill Smith', age: 45 } ], (error, users) ->
  console.log users
```
