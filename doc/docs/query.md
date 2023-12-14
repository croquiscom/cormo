---
id: query
title: Query
---

To query, create a query object using [BaseModel.query](/cormo/api/cormo/classes/basemodel.html#query) first.
Then build up a query by chaining methods,
and run a query by [Query#exec](/cormo/api/cormo/classes/query.html#exec),
[Query#count](/cormo/api/cormo/classes/query.html#count),
[Query#update](/cormo/api/cormo/classes/query.html#update),
or [Query#delete](/cormo/api/cormo/classes/query.html#delete).

[BaseModel](/cormo/api/cormo/classes/basemodel.html) class has some methods that borrowed from [Query](/cormo/api/cormo/classes/query.html) to run simple queries easily.

```typescript
const users = await User.query().where(\{ age: 27 }).exec();

// or

const users = await User.where(\{ age: 27 }).exec();
```

## Filter

You can select records with [Query#where](/cormo/api/cormo/classes/query.html#where) or [Query#find](/cormo/api/cormo/classes/query.html#find).
`where`'s criteria is similar to the MongoDB's.
Two or more `where`s mean a logical and.

<table class='table table-bordered'><thead><tr>
  <th>Description</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>Equal</td>
<td>User.where(\{ age: 27 })</td>
<td>SELECT * FROM users WHERE age=27</td>
<td>db.users.find(\{ age: 27 })</td>
</tr>

<tr>
<td rowspan='4'>Logical and</td>
<td>\{ name: 'John Doe', age: 27 }</td>
<td rowspan='4'>name='John Doe' AND age=27</td>
<td rowspan='4'>\{ name: 'John Doe', age: 27 }</td>
</tr>
<tr>
<td>.where(\{name: 'John Doe'}).where(\{age: 27})</td>
</tr>
<tr>
<td>\{ $and: [ \{ name: 'John Doe' }, \{ age: 27 } ] }</td>
</tr>
<tr>
<td>[ \{ name: 'John Doe' }, \{ age: 27 } ]</td>
</tr>

<tr>
<td>Logical or</td>
<td>\{ $or: [ \{ name: 'John Doe' }, \{ age: 27 } ] }</td>
<td>name='John Doe' OR age=27</td>
<td>\{ $or: [ \{ name: 'John Doe' }, \{ age: 27 } ] }</td>
</tr>

<tr>
<td>Comparison ($lt, $gt, $lte, $gte)</td>
<td>[ \{ age: \{ $gt: 30 } }, \{ age: \{ $lte: 45 } } ]</td>
<td>age>30 AND age&lt;=45</td>
<td>\{ $and: [ \{ age: \{ $gt: 30 } }, \{ age: \{ $lte: 45 } } ] }</td>
</tr>

<tr>
<td rowspan='2'>Containing some text in case insensitive</td>
<td>\{ name: \{ $contains: 'smi' } }</td>
<td>name LIKE '%smi%'</td>
<td>\{ name: /smi/i }</td>
</tr>
<tr>
<td>\{ name: \{ $contains: ['smi', 'doe'] } }</td>
<td>name LIKE '%smi%' OR name LIKE '%doe%'</td>
<td>\{ name: \{ $in: [/smi/i, /doe/i] } }</td>
</tr>

<tr>
<td>Starts with some text in case insensitive</td>
<td>\{ name: \{ $startswith: 'smi' } }</td>
<td>name LIKE 'smi%'</td>
<td>\{ name: /^smi/i }</td>
</tr>

<tr>
<td>Ends with some text in case insensitive</td>
<td>\{ name: \{ $endswith: 'smi' } }</td>
<td>name LIKE '%smi'</td>
<td>\{ name: /smi$/i }</td>
</tr>

<tr>
<td rowspan='2'>Regular expression</td>
<td>\{ name: /smi/ }</td>
<td>name REGEXP 'smi'</td>
<td>\{ name: /smi/i }</td>
</tr>
<tr>
<td>\{ name: /smi|doe/ }</td>
<td>name REGEXP 'smi|doe'</td>
<td>\{ name: /smi|doe/i }</td>
</tr>

<tr>
<td rowspan='2'>Matches any of an array</td>
<td>\{ age: \{ $in: [ 10, 20, 30 ] } }</td>
<td rowspan='2'>age IN (10,20,30)</td>
<td rowspan='2'>\{ age: \{ $in: [ 10, 20, 30 ] } }</td>
</tr>
<tr>
<td>\{ age: [ 10, 20, 30 ] }</td>
</tr>

<tr>
<td rowspan='7'>Logical not</td>
<td>\{ age: \{ $not: 27 } }</td>
<td>NOT (age=27) OR age IS NULL</td>
<td>\{ age: \{ $ne: 27 } }</td>
</tr>
<tr>
<td>\{ age: \{ $not: \{ $lt: 27 } } }</td>
<td>NOT (age&lt;27) OR age IS NULL</td>
<td>\{ age: \{ $not: \{ $lt: 27 } } }</td>
</tr>
<tr>
<td>\{ name: \{ $not: \{ $contains: 'smi' } } }</td>
<td>NOT (name LIKE '%smi%') OR name IS NULL</td>
<td>\{ name: \{ $not: /smi/i } }</td>
</tr>
<tr>
<td>\{ name: \{ $not: \{ $contains: ['smi', 'doe'] } } }</td>
<td>NOT (name LIKE '%smi%' OR name LIKE '%doe%') OR name IS NULL</td>
<td>\{ name: \{ $nin: [/smi/i, /doe/i] } }</td>
</tr>
<tr>
<td>\{ age: \{ $not: \{ $in: [ 10, 20, 30 ] } } }</td>
<td rowspan='2'>NOT (age IN (10,20,30)) OR age IS NULL</td>
<td rowspan='2'>\{ age: \{ $nin: [10,20,30] } }</td>
</tr>
<tr>
<td>\{ age: \{ $not: [ 10, 20, 30 ] } }</td>
</tr>
<tr>
<td>\{ name: \{ $not: null } }</td>
<td>NOT name IS NULL</td>
<td>\{ age: \{ $ne: null } }</td>
</tr>

</tbody></table>

If you want find records based on the identifier, use [Query#find](/cormo/api/cormo/classes/query.html#find) that accepts an ID or an array of IDs.
It is logically same to `.where(\{ id: <given ID or array of IDs> })`, but `find` throws an exception when records are not found while `where` does not.

### Conditional activation

If you want to apply different criteria in one query chain, you can use [Query#if](/cormo/api/cormo/classes/query.html#if) and [Query#endif](/cormo/api/cormo/classes/query.html#endif).
You can use them to simplify query statements.

```typescript
async function getOldUsers(options: \{ limit?: number; columns?: string[] }) \{
  const query = User.query();
  query.where(\{ age: \{ $gt: 30 } });
  if (options.limit) \{
    query.limit(options.limit);
  }
  if (options.columns) \{
    query.select(options.columns as any);
  }
  return await query.exec();
}

// wiil be

async function getOldUsers(options: \{ limit?: number; columns?: string[] }) \{
  return await User.query()
    .where(\{ age: \{ $gt: 30 } })
    .if(options.limit != null)
    .limit(options.limit)
    .endif()
    .if(options.columns != null)
    .select(options.columns as any)
    .endif()
    .exec();
}
```

## Retrieve records

[Query#exec](/cormo/api/cormo/classes/query.html#exec) retrieves records.

It normally returns an array of Model instances.
But if you use [Query#find](/cormo/api/cormo/classes/query.html#find) with a single ID, it will return a single Model instance.

```typescript
const user = await User.find(1).exec();
const users = await User.find([1, 2, 3]).exec();
```

[Query](/cormo/api/cormo/classes/query.html) has the `then` method (i.e. thenable) which calls `exec` internally. So you can omit to call `exec`, just `await`.

```typescript
const users = await User.where(\{ age: 30 });
```

[Query#find](/cormo/api/cormo/classes/query.html#find) will throw an error if any ID is not found.
`find` does not preserve given order, so if you want to get same ordered array, use [Query#findPreserve](/cormo/api/cormo/classes/query.html#findpreserve) instead.

```typescript
const users = await User.findPreserve([2, 1, 2, 3]).exec();
// users[0].id is 2, users[1].id is 1, users[2].id is 2 and users[3].id is 3
```

You can give some options for retrieving.

<table class='table table-bordered'><thead><tr>
  <th>Description</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>Projection</td>
<td>User.select(['id', 'name', 'age'])</td>
<td>SELECT id,name,age FROM users</td>
<td>db.users.find(\{}, \{ name: 1, age: 1 })</td>
</tr>

<tr>
<td>Sort</td>
<td>User.order('age -name')</td>
<td>SELECT * FROM users ORDER BY age ASC, name DESC</td>
<td>db.users.find().sort(\{ age: 1, name: -1 })</td>
</tr>

<tr>
<td>Limit</td>
<td>User.query().limit(3)</td>
<td>SELECT * FROM users LIMIT 3</td>
<td>db.users.find().limit(3)</td>
</tr>

<tr>
<td>Skip</td>
<td>User.query().skip(3)</td>
<td>SELECT * FROM users LIMIT 2147483647 OFFSET 3</td>
<td>db.users.find().skip(3)</td>
</tr>

</tbody></table>

### Request only one record

If you know that there will be only one result (e.x. query on unique column), [Query#one](/cormo/api/cormo/classes/query.html#one) will be helpful.
It makes a query return a single instance (or null) instead of array of instances.

```typescript
const user = await User.where(\{ age: 27 }).one();
```

### Select single column

If you interest only a column, you can use [Query#selectSingle](/cormo/api/cormo/classes/query.html#selectsingle).
Then the query object will return a value or an array of values instead of Model instances.

```typescript
const user_ids = await User.where(\{ age: 27 }).selectSingle('id');
const user_name = await User.find(1).selectSingle('name');
```

### Stream the result

If the result has huge records, you can use Node.js stream API to reduce memory usage.

```typescript
let count = 0;
await new Promise((resolve, reject) => \{
  const stream = User.where(\{ age: 27 }).stream();
  stream.on('data', function (user) \{
    count++;
  });
  stream.on('end', function () \{
    resolve();
  });
});
```

## Count records

[Query#count](/cormo/api/cormo/classes/query.html#count) returns the count of records.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.count()</td>
<td>SELECT COUNT(*) FROM users</td>
<td>db.users.count()</td>
</tr>

<tr>
<td>User.count(\{age: 27})</td>
<td rowspan='2'>SELECT COUNT(*) FROM users WHERE age=27</td>
<td rowspan='2'>db.users.find(\{age: 27}).count()</td>
</tr>
<tr>
<td>User.where(\{age: 27}).count()</td>
</tr>

</tbody></table>

## Update records

To update records, [BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save) and [Query#update](/cormo/api/cormo/classes/query.html#update) are provided.

[BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save) is used to update a single retrieved record.

```typescript
const user = await User.find(1);
user.age = 30;
await user.save();
```

Meanwhile, [Query#update](/cormo/api/cormo/classes/query.html#update) updates filtered records.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.update(\{ age: 10 }, \{ age: 27 })</td>
<td rowspan='2'>UPDATE users SET age=10 WHERE age=27</td>
<td rowspan='2'>db.users.update(\{age: 27}, \{$set: \{age: 10}}, \{multi: true})</td>
</tr>
<tr>
<td>User.where(\{ age: 27 }).update(\{ age:10 })</td>
</tr>

<tr>
<td>User.find(1).update(\{ age: 10 })</td>
<td>UPDATE users SET age=10 WHERE id=1</td>
<td>db.users.update(\{_id: 1}, \{$set: \{age: 10}}, \{multi: true})</td>
</tr>

<tr>
<td>User.find(2).update(\{ age: \{ $inc: 3 } })</td>
<td>UPDATE users SET age=age+3 WHERE id=2</td>
<td>db.users.update(\{_id: 2}, \{$inc: \{age: 3}}, \{multi: true})</td>
</tr>

</tbody></table>

[Query#update](/cormo/api/cormo/classes/query.html#update) may be faster because only update command will be sent to the database system.
Instead you will not get modified objects and update callbacks will not be called.

Choose one according to your needs.

In CORMO, Active Record pattern (i.e. `BaseModel#save`) is not battle-tested. So use it with caution.

## Delete records

[Query#delete](/cormo/api/cormo/classes/query.html#delete) or [BaseModel#destroy](/cormo/api/cormo/classes/basemodel.html#destroy) deletes some records.

[BaseModel#destroy](/cormo/api/cormo/classes/basemodel.html#destroy) deletes one record by ID similar to `BaseModel#save`. And [Query#delete](/cormo/api/cormo/classes/query.html#delete) deletes filtered records like `Query#update`.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.delete(\{age: 27})</td>
<td rowspan='2'>DELETE FROM users WHERE age=27</td>
<td rowspan='2'>db.users.remove(\{age: 27})</td>
</tr>
<tr>
<td>User.where(\{age: 27}).delete()</td>
</tr>

<tr>
<td>User.delete()</td>
<td>DELETE FROM users</td>
<td>db.users.remove()</td>
</tr>

</tbody></table>
