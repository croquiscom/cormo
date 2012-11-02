# About

CORMO is an ORM framework for Node.js.

Currently supports:

* multi-DB: MySQL, MongoDB, SQLite3, PostgreSQL
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
DBConnection = require('cormo').DBConnection

connection = new DBConnection 'mysql', database: 'test'

another = new DBConnection 'mongodb', database: 'test'
```

See documents for each adapter([[#AdapterBase]]) for detail options.

## Define models

```coffeescript
 # this will create two tables - users, posts.

User = connection.model 'User',
  name: String
  age: Number

 # 'String' is the same as '{ type: String }'
Post = connection.model 'Post',
  title: String
  body: { type: String }

connection.applySchemas (error) ->
  console.log error
```

You can use any of cormo.String, DBConnection.String, connection.String, or 'string'
(also native JavaScript Function - String - if exists) to specify a type.

Currently supported types:

* String
* Number
* Integer
* Date
* GeoPoint (MySQL, MonogoDB only)

See [[#DBConnection::model]], [[#DBConnection::applySchemas]] for more details.

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
User.create { name: 'John Doe', age: 27 }, (error, user4) ->
  console.log error
```

See [[#DBModel::constructor]], [[#DBModel::save]], [[#DBModel.build]], [[#DBModel.create]] for more details.

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

 # get count of all records
 # the same as "SELECT COUNT(*) FROM users"
User.count (error, count) ->
  console.log count

 # get count of matched records
 # the same as "SELECT COUNT(*) FROM users WHERE age=27"
User.count age: 27, (error, count) ->
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

 # limit records
 # the same as "SELECT * FROM users WHERE age<40 LIMIT 3"
User.where(age: { $lt: 40 }).limit(3).exec (error, users) ->
  console.log users
```

See [[#DBModel.find]], [[#DBModel.where]], [[#DBModel.count]], [[#DBModel.delete]], [[#DBQuery]] for more details.

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

connection.applySchemas()

User.create { name: 'Bill Smith', age: 45, email: 'bill@foo.org' }, (error, user1) ->
  User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, (error, user2) ->
    # error.message will be 'duplicated email' or 'duplicated'
```

See [[#DBConnection::model]] for more details.

## Validations

If you want validations, adds a validator using [[#DBModel.addValidator]].

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

connection.applySchemas()

User.create { name: 'John Doe', age: 10, email: 'invalid' }, (error, user) ->
  # error.message will be 'invalid email,too young' or 'too young,invalid email'
```

See [[#DBModel.addValidator]] for more details.

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

 # you must call applySchemas after defining association
connection.applySchemas()

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

See [[#DBModel.hasMany]], [[#DBModel.belongsTo]] for more details.

## Geospatial query

Currently, we supports only near query of 2D location in MongoDB and MySQL.

```coffeescript
Place = connection.model 'Place',
  name: String
  location: DBConnection.GeoPoint

connection.applySchemas()

 # create 
Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

 # query
Place.where().near(location: [-5, 45]).limit(4).exec (error, places) ->
  console.log places
```

See [[#DBQuery::near]] for more details.
