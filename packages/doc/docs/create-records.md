---
id: create-records
title: Create Records
---

You can build a record using [[#BaseModel::constructor]] or [[#BaseModel.build]].

```coffeescript
user1 = new User()
user1.name = 'John Doe'
user1.age = 27

user2 = new User name: 'John Doe', age: 27

user3 = User.build name: 'John Doe', age: 27
```
```javascript
user1 = new User();
user1.name = 'John Doe';
user1.age = 27;

user2 = new User({ name: 'John Doe', age: 27 });

user3 = User.build({ name: 'John Doe', age: 27 });
```

Then call [[#BaseModel::save]] to make it persistent.

```coffeescript
user1.save (error) ->
  console.log error
```
```javascript
user1.save(function (error) {
  console.log(error);
});
```

[[#BaseModel.create]] builds and saves at once.

```coffeescript
User.create name: 'John Doe', age: 27, (error, user4) ->
  console.log error
```
```javascript
User.create({ name: 'John Doe', age: 27 }, function (error, user4) {
  console.log(error);
});
```

[[#BaseModel.createBulk]] creates multiple records at once.

```coffeescript
User.createBulk [
  { name: 'John Doe', age: 27 }
  { name: 'Bill Smith', age: 45 }
  { name: 'Alice Jackson', age: 27 }
], (error, users) ->
  console.log error
```
```javascript
User.createBulk([
  { name: 'John Doe', age: 27 },
  { name: 'Bill Smith', age: 45 },
  { name: 'Alice Jackson', age: 27 }
], function (error, users) {
  console.log(error);
});
```
