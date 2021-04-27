질의를 위해서는 먼저 [BaseModel.query](/cormo/api/cormo/classes/basemodel.html#query)를 이용해 질의 객체를 만드세요.
그리고 메소드 연쇄를 통해 질의를 만들어 나간 후,
[Query#exec](/cormo/api/cormo/classes/query.html#exec)나
[Query#count](/cormo/api/cormo/classes/query.html#count),
[Query#update](/cormo/api/cormo/classes/query.html#update),
[Query#delete](/cormo/api/cormo/classes/query.html#delete)를 사용해 질의를 실행합니다.

단순한 질의를 쉽게 실행하기 위해서 [BaseModel](/cormo/api/cormo/classes/basemodel.html) 클래스는 [Query](/cormo/api/cormo/classes/query.html)에서 일부 메소드를 빌려와 가지고 있습니다.

```typescript
const users = await User.query().where({ age: 27 }).exec();

// 또는

const users = await User.where({ age: 27 }).exec();
```

## 필터

[Query#where](/cormo/api/cormo/classes/query.html#where)나 [Query#find](/cormo/api/cormo/classes/query.html#find)를 사용해 레코드를 선택할 수 있습니다.
`where`의 조건문은 MongoDB의 문법과 비슷합니다.
`where`를 두개 이상 사용할 경우 논리곱(모두 참)을 의미합니다.

<table class='table table-bordered'><thead><tr>
  <th>설명</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>같음</td>
<td>User.where({ age: 27 })</td>
<td>SELECT * FROM users WHERE age=27</td>
<td>db.users.find({ age: 27 })</td>
</tr>

<tr>
<td rowspan='4'>논리곱(모두 참)</td>
<td>{ name: 'John Doe', age: 27 }</td>
<td rowspan='4'>name='John Doe' AND age=27</td>
<td rowspan='4'>{ name: 'John Doe', age: 27 }</td>
</tr>
<tr>
<td>.where({name: 'John Doe'}).where({age: 27})</td>
</tr>
<tr>
<td>{ $and: [ { name: 'John Doe' }, { age: 27 } ] }</td>
</tr>
<tr>
<td>[ { name: 'John Doe' }, { age: 27 } ]</td>
</tr>

<tr>
<td>논리합(하나 이상 참)</td>
<td>{ $or: [ { name: 'John Doe' }, { age: 27 } ] }</td>
<td>name='John Doe' OR age=27</td>
<td>{ $or: [ { name: 'John Doe' }, { age: 27 } ] }</td>
</tr>

<tr>
<td>비교 ($lt, $gt, $lte, $gte)</td>
<td>[ { age: { $gt: 30 } }, { age: { $lte: 45 } } ]</td>
<td>age>30 AND age<=45</td>
<td>{ $and: [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ] }</td>
</tr>

<tr>
<td rowspan='2'>대소문자 구분 없이 텍스트를 포함</td>
<td>{ name: { $contains: 'smi' } }</td>
<td>name LIKE '%smi%'</td>
<td>{ name: /smi/i }</td>
</tr>
<tr>
<td>{ name: { $contains: ['smi', 'doe'] } }</td>
<td>name LIKE '%smi%' OR name LIKE '%doe%'</td>
<td>{ name: { $in: [/smi/i, /doe/i] } }</td>
</tr>

<tr>
<td>대소문자 구분 없이 텍스트로 시작</td>
<td>{ name: { $startswith: 'smi' } }</td>
<td>name LIKE 'smi%'</td>
<td>{ name: /^smi/i }</td>
</tr>

<tr>
<td>대소문자 구분 없이 텍스트로 끝남</td>
<td>{ name: { $endswith: 'smi' } }</td>
<td>name LIKE '%smi'</td>
<td>{ name: /smi$/i }</td>
</tr>

<tr>
<td rowspan='2'>정규표현식</td>
<td>{ name: /smi/ }</td>
<td>name REGEXP 'smi'</td>
<td>{ name: /smi/i }</td>
</tr>
<tr>
<td>{ name: /smi|doe/ }</td>
<td>name REGEXP 'smi|doe'</td>
<td>{ name: /smi|doe/i }</td>
</tr>

<tr>
<td rowspan='2'>배열의 값 중 하나라도 일치</td>
<td>{ age: { $in: [ 10, 20, 30 ] } }</td>
<td rowspan='2'>age IN (10,20,30)</td>
<td rowspan='2'>{ age: { $in: [ 10, 20, 30 ] } }</td>
</tr>
<tr>
<td>{ age: [ 10, 20, 30 ] }</td>
</tr>

<tr>
<td rowspan='7'>부정</td>
<td>{ age: { $not: 27 } }</td>
<td>NOT (age=27) OR age IS NULL</td>
<td>{ age: { $ne: 27 } }</td>
</tr>
<tr>
<td>{ age: { $not: { $lt: 27 } } }</td>
<td>NOT (age<27) OR age IS NULL</td>
<td>{ age: { $not: { $lt: 27 } } }</td>
</tr>
<tr>
<td>{ name: { $not: { $contains: 'smi' } } }</td>
<td>NOT (name LIKE '%smi%') OR name IS NULL</td>
<td>{ name: { $not: /smi/i } }</td>
</tr>
<tr>
<td>{ name: { $not: { $contains: ['smi', 'doe'] } } }</td>
<td>NOT (name LIKE '%smi%' OR name LIKE '%doe%') OR name IS NULL</td>
<td>{ name: { $nin: [/smi/i, /doe/i] } }</td>
</tr>
<tr>
<td>{ age: { $not: { $in: [ 10, 20, 30 ] } } }</td>
<td rowspan='2'>NOT (age IN (10,20,30)) OR age IS NULL</td>
<td rowspan='2'>{ age: { $nin: [10,20,30] } }</td>
</tr>
<tr>
<td>{ age: { $not: [ 10, 20, 30 ] } }</td>
</tr>
<tr>
<td>{ name: { $not: null } }</td>
<td>NOT name IS NULL</td>
<td>{ age: { $ne: null } }</td>
</tr>

</tbody></table>

식별자에 기반해 레코드를 찾으려면 하나의 ID나 ID의 배열을 인자로 하는 [Query#find](/cormo/api/cormo/classes/query.html#find)를 사용합니다.
논리적으로는 `.where({ id: <주어진 ID나 ID의 배열> })`과 동일하지만, 해당 레코드가 없을 경우 `find`는 예외를 발생시키는데 반해, `where`는 빈 결과를 반환합니다.

### 조건부 활성화

하나의 질의 연쇄에서 다른 조건을 적용하고 싶은 경우, [Query#if](/cormo/api/cormo/classes/query.html#if)와 [Query#endif](/cormo/api/cormo/classes/query.html#endif)를 사용할 수 있습니다.
이를 이용해 질의 문장을 단순화할 수 있습니다.

```typescript
async function getOldUsers(options: { limit?: number; columns?: string[] }) {
  const query = User.query();
  query.where({ age: { $gt: 30 } });
  if (options.limit) {
    query.limit(options.limit);
  }
  if (options.columns) {
    query.select(options.columns as any);
  }
  return await query.exec();
}

// 위 코드를 다음과 같이 작성할 수 있습니다.

async function getOldUsers(options: { limit?: number; columns?: string[] }) {
  return await User.query()
    .where({ age: { $gt: 30 } })
    .if(options.limit != null)
    .limit(options.limit)
    .endif()
    .if(options.columns != null)
    .select(options.columns as any)
    .endif()
    .exec();
}
```

## 레코드 가져오기

[Query#exec](/cormo/api/cormo/classes/query.html#exec)는 레코드를 가져옵니다.

보통은 Model 인스턴스의 배열을 반환합니다.
하지만 하나의 ID를 가지고 [Query#find](/cormo/api/cormo/classes/query.html#find)를 호출한 경우에는 하나의 Model 인스턴스를 반환합니다.

```typescript
const user = await User.find(1).exec();
const users = await User.find([1, 2, 3]).exec();
```

[Query](/cormo/api/cormo/classes/query.html)는 내부적으로 `exec`를 호출하는 `then` 메소드를 가지고 있습니다(즉 thenable). 따라서 `exec` 호출을 생략하고 단순히 `await`만 붙여줘도 됩니다.

```typescript
const users = await User.where({ age: 30 });
```

찾지 못하는 ID가 있는 경우 [Query#find](/cormo/api/cormo/classes/query.html#find)는 에러를 던집니다.
`find`는 주어진 순서를 보정하지 않습니다. 순서를 보장하고 싶은 경우 대신 [Query#findPreserve](/cormo/api/cormo/classes/query.html#findpreserve)를 사용하십시오.

```typescript
const users = await User.findPreserve([2, 1, 2, 3]).exec();
// users[0].id는 2, users[1].id는 1, users[2].id는 2, users[3].id는 3입니다.
```

가져오기시 몇가지 옵션을 줄 수 있습니다.

<table class='table table-bordered'><thead><tr>
  <th>설명</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>컬럼 선택</td>
<td>User.select(['id', 'name', 'age'])</td>
<td>SELECT id,name,age FROM users</td>
<td>db.users.find({}, { name: 1, age: 1 })</td>
</tr>

<tr>
<td>정렬</td>
<td>User.order('age -name')</td>
<td>SELECT * FROM users ORDER BY age ASC, name DESC</td>
<td>db.users.find().sort({ age: 1, name: -1 })</td>
</tr>

<tr>
<td>제한</td>
<td>User.query().limit(3)</td>
<td>SELECT * FROM users LIMIT 3</td>
<td>db.users.find().limit(3)</td>
</tr>

<tr>
<td>건너뛰기</td>
<td>User.query().skip(3)</td>
<td>SELECT * FROM users LIMIT 2147483647 OFFSET 3</td>
<td>db.users.find().skip(3)</td>
</tr>

</tbody></table>

### 하나의 레코드만 요청하기

하나의 결과만 있는 것을 알고 있다면 (예를 들어 유니크 컬럼으로 질의), [Query#one](/cormo/api/cormo/classes/query.html#one)가 유용할 겁니다.
인스턴스 배열을 반환하는 대신 하나의 인스턴스 (또는 null)을 반환하도록 만듭니다.

```typescript
const user = await User.where({ age: 27 }).one();
```

### 하나의 컬럼만 선택하기

하나의 컬럼에만 관심이 있다면 [Query#selectSingle](/cormo/api/cormo/classes/query.html#selectsingle)를 사용할 수 있습니다.
그러면 질의 객체는 Model 인스턴스 대신 하나의 값이나 값의 배열을 반환합니다.

```typescript
const user_ids = await User.where({ age: 27 }).selectSingle('id');
const user_name = await User.find(1).selectSingle('name');
```

### 결과를 스트림 시키기

결과가 아주 많은 레코드를 가지고 있는 경우, 메모리 사용량을 줄이기 위해 Node.js의 stream API를 사용할 수 있습니다.

```typescript
let count = 0;
await new Promise((resolve, reject) => {
  const stream = User.where({ age: 27 }).stream();
  stream.on('data', function (user) {
    count++;
  });
  stream.on('end', function () {
    resolve();
  });
});
```

## 레코드 수 새기

[Query#count](/cormo/api/cormo/classes/query.html#count)는 레코드의 수를 반환합니다.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.count()</td>
<td>SELECT COUNT(*) FROM users</td>
<td>db.users.count()</td>
</tr>

<tr>
<td>User.count({age: 27})</td>
<td rowspan='2'>SELECT COUNT(*) FROM users WHERE age=27</td>
<td rowspan='2'>db.users.find({age: 27}).count()</td>
</tr>
<tr>
<td>User.where({age: 27}).count()</td>
</tr>

</tbody></table>

## 레코드 갱신하기

레코드를 갱신하기 위해 [BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save)와 [Query#update](/cormo/api/cormo/classes/query.html#update)를 제공하고 있습니다.

[BaseModel#save](/cormo/api/cormo/classes/basemodel.html#save)는 가져온 하나의 레코드를 갱신하기 위해 사용합니다.

```typescript
const user = await User.find(1);
user.age = 30;
await user.save();
```

한편, [Query#update](/cormo/api/cormo/classes/query.html#update)는 필터된 레코드를 갱신합니다.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.update({ age: 10 }, { age: 27 })</td>
<td rowspan='2'>UPDATE users SET age=10 WHERE age=27</td>
<td rowspan='2'>db.users.update({age: 27}, {$set: {age: 10}}, {multi: true})</td>
</tr>
<tr>
<td>User.where({ age: 27 }).update({ age:10 })</td>
</tr>

<tr>
<td>User.find(1).update({ age: 10 })</td>
<td>UPDATE users SET age=10 WHERE id=1</td>
<td>db.users.update({_id: 1}, {$set: {age: 10}}, {multi: true})</td>
</tr>

<tr>
<td>User.find(2).update({ age: { $inc: 3 } })</td>
<td>UPDATE users SET age=age+3 WHERE id=2</td>
<td>db.users.update({_id: 2}, {$inc: {age: 3}}, {multi: true})</td>
</tr>

</tbody></table>

[Query#update](/cormo/api/cormo/classes/query.html#update)는 갱신 명량만 데이터베이스 시스템에 전송하기 때문에 보통 더 빠릅니다.
대신 수정된 객체를 얻을 수 없고, 갱신 콜백도 호출되지 않습니다.

필요에 따라서 적절한 것을 사용하세요.

In CORMO, Active Record 패턴(즉 `BaseModel#save`)은 운영환경에서 잘 검증되지 않았습니다. 그러므로 주의해서 사용해주세요.

## 레코드 삭제하기

[Query#delete](/cormo/api/cormo/classes/query.html#delete)나 [BaseModel#destroy](/cormo/api/cormo/classes/basemodel.html#destroy)는 레코드를 삭제합니다.

[BaseModel#destroy](/cormo/api/cormo/classes/basemodel.html#destroy)는 `BaseModel#save`와 비슷하게 ID를 통해 하나의 레코드를 삭제합니다. 그리고 [Query#delete](/cormo/api/cormo/classes/query.html#delete) 는 `Query#update`와 비슷하게 필터된 레코드를 삭제합니다.

<table class='table table-bordered'><thead><tr>
  <th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>User.delete({age: 27})</td>
<td rowspan='2'>DELETE FROM users WHERE age=27</td>
<td rowspan='2'>db.users.remove({age: 27})</td>
</tr>
<tr>
<td>User.where({age: 27}).delete()</td>
</tr>

<tr>
<td>User.delete()</td>
<td>DELETE FROM users</td>
<td>db.users.remove()</td>
</tr>

</tbody></table>
