---
id: create-records
title: Create Records
---

You can build a record using [BaseModel#constructor](/cormo/api/cormo/classes/basemodel.html#constructor) or [BaseModel.build](/cormo/api/cormo/classes/basemodel.html#build).

```typescript
const user1 = new User();
user1.name = 'John Doe';
user1.age = 27;

const user2 = new User({ name: 'John Doe', age: 27 });

const user3 = User.build({ name: 'John Doe', age: 27 });
```

Then call [BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save) to make it persistent.

```typescript
await user1.save();
```

[BaseModel.create](/cormo/api/cormo/classes/basemodel.html#create) builds and saves at once.

```typescript
const user4 = await User.create({ name: 'John Doe', age: 27 });
```

[BaseModel.createBulk](/cormo/api/cormo/classes/basemodel.html#createbulk) creates multiple records at once.

```typescript
const users = await User.createBulk([
  { name: 'John Doe', age: 27 },
  { name: 'Bill Smith', age: 45 },
  { name: 'Alice Jackson', age: 27 }
]);
```
