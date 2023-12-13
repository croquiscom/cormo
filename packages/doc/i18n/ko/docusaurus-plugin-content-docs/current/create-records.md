[BaseModel#constructor](/cormo/api/cormo/classes/basemodel.html#constructor)나 [BaseModel.build](/cormo/api/cormo/classes/basemodel.html#build)를 사용해서 레코드를 생성할 수 있습니다.

```typescript
const user1 = new User();
user1.name = 'John Doe';
user1.age = 27;

const user2 = new User({ name: 'John Doe', age: 27 });

const user3 = User.build({ name: 'John Doe', age: 27 });
```

그리고 이를 실제 DB에 저장하기 위해서는 [BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save)를 호출하면 됩니다.

```typescript
await user1.save();
```

[BaseModel.create](/cormo/api/cormo/classes/basemodel.html#create)는 생성과 저장을 동시에 수행합니다.

```typescript
const user4 = await User.create({ name: 'John Doe', age: 27 });
```

여러 레코드를 동시에 생성하려면 [BaseModel.createBulk](/cormo/api/cormo/classes/basemodel.html#createbulk)를 사용합니다.

```typescript
const users = await User.createBulk([
  { name: 'John Doe', age: 27 },
  { name: 'Bill Smith', age: 45 },
  { name: 'Alice Jackson', age: 27 },
]);
```
