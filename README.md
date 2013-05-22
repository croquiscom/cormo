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

User.where($or: [ { age: { $lt: 20 } }, { age: { $gt: 60 } } ])
  .where(name: { $contains: 'smi' })
  .exec (error, users) ->
```

## Count records

```coffeescript
User.count (error, count) ->

User.count age: 27, (error, count) ->
```

## Update records

```coffeescript
User.find 1, (error, user) ->
  user.age = 30
  user.save (error) ->

User.find(1).update age: 10, (error, count) ->

User.where(age: 27).update age:10, (error, count) ->
```

## Delete records

```coffeescript
User.delete age: 27, (error, count) ->
```

## Constraint

```coffeescript
class User extends cormo.Model
  @column 'name', type: String, required: true
  @column 'age', type: Number, required: true
  @column 'email', type: String, unique: true, required: true
```

## Validation

```coffeescript
class User extends cormo.Model
  @column 'name', String
  @column 'age', Number
  @column 'email', String

  @addValidator (record) ->
    if record.age < 18
      return 'too young'
```

## Callbacks

```coffeescript
class User extends cormo.Model
  @column 'name', String
  @column 'age', Number

  @beforeSave ->
    @name = @name.trim()
```

## Associations

```coffeescript
class User extends cormo.Model
  @column 'name', String
  @column 'age', Number
  @hasMany 'posts'

class Post extends cormo.Model
  @column 'title', String
  @column 'body', String
  @belongsTo 'user'
```

## Geospatial query

```coffeescript
class Place extends cormo.Model
  @column 'name', String
  @column 'location', cormo.types.GeoPoint

# create 
Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

# query
Place.query().near(location: [-5, 45]).limit(4).exec (error, places) ->
  console.log places
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
