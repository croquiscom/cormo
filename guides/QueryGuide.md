To query, create a query object using [[#ModelQuery.query]] first.
Then build up a query by chaining methods,
and run a query by [[#Query::exec]], [[#Query::count]], [[#Query::update]], or [[#Query::delete]].

Also, [[#ModelQuery]] class has some methods that borrowed from [[#Query]] to run simple queries easily.

```coffeescript
User.query().where(age: 27).exec (error, users) ->
  console.log users

User.where(age: 27).exec (error, users) ->
  console.log users

User.where age:27, (error, users) ->
  console.log users
```
```javascript
User.query().where({age: 27}).exec(function (error, users) {
  console.log(users);
});

User.where({age: 27}).exec(function (error, users) {
  console.log(users);
});

User.where({age:27}, function (error, users) {
  console.log(users);
});
```

# Selection criteria

You can give criteria for selection with [[#Query::where]] or [[#Query::find]].
[[#Query::where]]'s criteria is similar to the MongoDB's.
Two or more [[#Query::where]]s mean a logical and.

<table class='table table-bordered'><thead><tr>
  <th>Description</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>Equal</td>
<td>User.where(age: 27).exec (error, users) -></td>
<td>SELECT * FROM users WHERE age=27</td>
<td>db.users.find({age: 27})</td>
</tr>

<tr>
<td rowspan='4'>Logical and</td>
<td>name: 'John Doe', age: 27</td>
<td rowspan='4'>name='John Doe' AND age=27</td>
<td rowspan='4'>{ name: 'John Doe', age: 27 }</td>
</tr>
<tr>
<td>.where(name: 'John Doe').where(age: 27)</td>
</tr>
<tr>
<td>$and: [ { name: 'John Doe' }, { age: 27 } ]</td>
</tr>
<tr>
<td>[ { name: 'John Doe' }, { age: 27 } ]</td>
</tr>

<tr>
<td>Logical or</td>
<td>$or: [ { name: 'John Doe' }, { age: 27 } ]</td>
<td>name='John Doe' OR age=27</td>
<td>{ $or: [ { name: 'John Doe' }, { age: 27 } ] }</td>
</tr>

<tr>
<td>Comparison ($lt, $gt, $lte, $gte)</td>
<td>[ { age: { $gt: 30 } }, { age: { $lte: 45 } } ]</td>
<td>age>30 AND age<=45</td>
<td>{ $and: [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ] }</td>
</tr>

<tr>
<td rowspan='2'>Containing some text in case insensitive</td>
<td>name: { $contains: 'smi' }</td>
<td>name LIKE '%smi%'</td>
<td>{ name: /smi/i }</td>
</tr>
<tr>
<td>name: { $contains: ['smi', 'doe'] }</td>
<td>name LIKE '%smi%' OR name LIKE '%doe%'</td>
<td>{ name: { $in: [/smi/i, /doe/i] } }</td>
</tr>

<tr>
<td>Starts with some text in case insensitive</td>
<td>name: { $startswith: 'smi' }</td>
<td>name LIKE 'smi%'</td>
<td>{ name: /^smi/i }</td>
</tr>

<tr>
<td>Ends with some text in case insensitive</td>
<td>name: { $endswith: 'smi' }</td>
<td>name LIKE '%smi'</td>
<td>{ name: /smi$/i }</td>
</tr>

<tr>
<td rowspan='2'>Regular expression</td>
<td>name: /smi/</td>
<td>name REGEXP 'smi'</td>
<td>{ name: /smi/i }</td>
</tr>
<tr>
<td>name: /smi|doe/</td>
<td>name REGEXP 'smi|doe'</td>
<td>{ name: /smi|doe/i }</td>
</tr>

<tr>
<td rowspan='2'>Matches any of an array</td>
<td>age: { $in: [ 10, 20, 30 ] }</td>
<td rowspan='2'>age IN (10,20,30)</td>
<td rowspan='2'>{ age: { $in: [ 10, 20, 30 ] } }</td>
</tr>
<tr>
<td>age: [ 10, 20, 30 ]</td>
</tr>

<tr>
<td rowspan='7'>Logical not</td>
<td>age: $not: 27</td>
<td>NOT (age=27) OR age IS NULL</td>
<td>{ age: { $ne: 27 } }</td>
</tr>
<tr>
<td>age: $not: $lt: 27</td>
<td>NOT (age<27) OR age IS NULL</td>
<td>{ age: { $not: { $lt: 27 } } }</td>
</tr>
<tr>
<td>name: $not: $contains: 'smi'</td>
<td>NOT (name LIKE '%smi%') OR name IS NULL</td>
<td>{ name: { $not: /smi/i } }</td>
</tr>
<tr>
<td>name: $not: $contains: ['smi', 'doe']</td>
<td>NOT (name LIKE '%smi%' OR name LIKE '%doe%') OR name IS NULL</td>
<td>{ name: { $nin: [/smi/i, /doe/i] } }</td>
</tr>
<tr>
<td>age: $not: $in: [ 10, 20, 30 ]</td>
<td rowspan='2'>NOT (age IN (10,20,30)) OR age IS NULL</td>
<td rowspan='2'>{ age: { $nin: [10,20,30] } }</td>
</tr>
<tr>
<td>age: $not: [ 10, 20, 30 ]</td>
</tr>
<tr>
<td>name: $not: null</td>
<td>NOT name IS NULL</td>
<td>{ age: { $ne: null } }</td>
</tr>

</tbody></table>

If you want find records based on the identifier, use [[#Query::find]] that accepts an ID or an array of IDs.
It is logically same to '.where(id: &lt;given ID or array of IDs&gt;)'.

## Conditional criteria

If you want to apply different criteria in one query chain, you can use [[#Query::if]], [[#Query::endif]].
It is helpful such as when you corresspond one REST API to one query.

```coffeescript
getUsers = (options) ->
  User.query()
  .where(age: $gt: 30)
  .if(options.limit).limit(options.limit).endif()
  .if(options.fields).select(options.fields).endif()
  .exec()
```
```javascript
function getUsers(options) {
  return User.query()
  .where({age: {$gt: 30}})
  ["if"](options.limit).limit(options.limit).endif()
  ["if"](options.fields).select(options.fields).endif()
  .exec();
};
```

# Retrieve records

[[#Query::exec]] retrieves records.

It normally returns an array of Model instances.
But if you use [[#Query::find]] for a single ID, it will return a single Model instance.

```coffeescript
User.find 1, (error, user) ->
  console.log user

User.find [1,2,3], (error, users) ->
  console.log users
```
```javascript
User.find(1, function (error, user) {
  console.log(user);
});

User.find([1,2,3], function (error, users) {
  console.log(users);
});
```

[[#Query::find]] does not return error if any ID is found and does not preserve given order.
If you want to guarantee that you get all records of IDs and order is preserved,
use [[#Query::findPreserve]] instead.

```coffeescript
User.findPreserve [2,1,2,3], (error, users) ->
  # users[0].id is 2 and users[1].id is 1 and users[2].id is 2 and users[3].id is 3
```
```javascript
User.findPreserve([2,1,2,3], function (error, users) {
  // users[0].id is 2 and users[1].id is 1 and users[2].id is 2 and users[3].id is 3
});
```

You can give some options to [[#Query::exec]].

<table class='table table-bordered'><thead><tr>
  <th>Description</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>Projection</td>
<td>User.select('name age').exec</td>
<td>SELECT id,name,age FROM users</td>
<td>db.users.find({}, { name: 1, age: 1 })</td>
</tr>

<tr>
<td>Sort</td>
<td>User.order('age -name').exec</td>
<td>SELECT \* FROM users ORDER BY age ASC, name DESC</td>
<td>db.users.find().sort({ age: 1, name: -1 })</td>
</tr>

<tr>
<td>Limit</td>
<td>User.query().limit(3).exec</td>
<td>SELECT \* FROM users LIMIT 3</td>
<td>db.users.find().limit(3)</td>
</tr>

<tr>
<td>Skip</td>
<td>User.query().skip(3).exec</td>
<td>SELECT * FROM users LIMIT 2147483647 OFFSET 3</td>
<td>db.users.find().skip(3)</td>
</tr>

</tbody></table>

## Request only one record

If you know that there will be only one result (e.x. query on unique column), [[#Query::one]] will be helpful.
It makes a query return a single instance (or null) instead of array of instances.

```coffeescript
User.where(age: 27).one().exec (error, user) ->
  console.log user
```
```javascript
User.where({age: 27}).one().exec(function (error, user) {
  console.log(user);
});
```

## Stream the result

If the result has many records, you can use Node.js stream API to reduce memory usage.

```coffeescript
count = 0
User.where(age: 27).stream()
.on 'data', (user) ->
  count++
.on 'end', ->
```
```javascript
count = 0;
User.where({age: 27}).stream()
.on('data', function (user) {
  count++;
}).on('end', function () {
});
```

# Count records

[[#Query::count]] returns the count of records.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.count (error, count) -></td>
<td>SELECT COUNT(\*) FROM users</td>
<td>db.users.count()</td>
</tr>

<tr>
<td>User.count age: 27, (error, count) -></td>
<td rowspan='2'>SELECT COUNT(\*) FROM users WHERE age=27</td>
<td rowspan='2'>db.users.find({age: 27}).count()</td>
</tr>
<tr>
<td>User.where(age: 27).count (error, count) -></td>
</tr>

</tbody></table>

# Update records

To update records, [[#ModelPersistence::save]] and [[#Query::update]] are provided.

[[#ModelPersistence::save]] is used to update a single retrieved record.

```coffeescript
User.find 1, (error, user) ->
  user.age = 30
  user.save (error) ->
```
```javascript
User.find(1, function (error, user) {
  user.age = 30;
  user.save(function (error) {
  });
});
```

But [[#ModelPersistence::save]] has some weaknesses.

* You must retrieve a record before modification.
    * In normal application, retrieved data may not be used usually.
* This requires to read all fields from database and send all fields to database.
    * If you save projected([[#Query::select]]) record, other fields will set to null.
    * CORMO has the partial update option([[#BaseModel.dirty_tracking]]). But currently it rather is slow. So it is turned off by default.

[[#Query::update]] updates selected records.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.update { age: 10 }, age: 27, (error, count) -></td>
<td rowspan='2'>UPDATE users SET age=10 WHERE age=27</td>
<td rowspan='2'>db.users.update({age: 27}, {$set: {age: 10}}, {multi: true})</td>
</tr>
<tr>
<td>User.where(age: 27).update age:10, (error, count) -></td>
</tr>

<tr>
<td>User.find(1).update age: 10, (error, count) -></td>
<td>UPDATE users SET age=10 WHERE id=1</td>
<td>db.users.update({_id: 1}, {$set: {age: 10}}, {multi: true})</td>
</tr>

<tr>
<td>User.find(2).update age: $inc: 3, (error, count) -></td>
<td>UPDATE users SET age=age+3 WHERE id=2</td>
<td>db.users.update({_id: 2}, {$inc: {age: 3}}, {multi: true})</td>
</tr>

</tbody></table>

But you cannot use other column's value as data like SQL does on [[#Query::update]].
If you want this, you must retrieve the record first.
But [[#Query::update]] may be more efficient than [[#ModelPersistence::save]] even if in that case.

```coffeescript
User.find 1, (error, user) ->
  age = user.age + 1
  User.find(user.id).update age: age, (error, count) ->
```
```javascript
User.find(1, function (error, user) {
  var age = user.age + 1;
  User.find(user.id).update({age: age}, function (error, count) {
  });
});
```

# Delete records

[[#Query::delete]] or [[#BaseModel::destroy]] deletes some records.
[[#BaseModel::destroy]] is similar to [[#Query::delete]] on the model's ID.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.delete age: 27, (error, count) -></td>
<td rowspan='2'>DELETE FROM users WHERE age=27</td>
<td rowspan='2'>db.users.remove({age: 27})</td>
</tr>
<tr>
<td>User.where(age: 27).delete (error, count) -></td>
</tr>

<tr>
<td>User.delete (error, count) -></td>
<td>DELETE FROM users</td>
<td>db.users.remove()</td>
</tr>

</tbody></table>
