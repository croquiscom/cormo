---
id: constraint
title: Constraint
---

현재 CORMO는 'unique'(유니크)와 'required'(필수, null이 아님)을 지원합니다.

'unique'는 데이터베이스 계층에서 지원합니다.
유니크 제약 위반이 발생하면, 'duplicated &lt;컬럼명&gt;' 오류가 발생합니다.
(어떤 어댑터는 단순히 'duplicated'를 던집니다.)

'required'는 CORMO 계층의 유효성 검사 과정 또는 데이터베이스 계층에서 지원합니다.
필수 제약 위반이 발생하면, '&lt;컬럼명&gt;' is required' 오류가 발생합니다.

유니크이지만 필수가 아닌 컬럼은 null 값을 여러개 가질 수 있습니다.

```typescript
@cormo.Model()
class User extends cormo.BaseModel {
  @cormo.Column({ type: String, required: true })
  name!: string;

  @cormo.Column({ type: Number, required: true })
  age!: number;

  @cormo.Column({ type: String, unique: true, required: true })
  email!: string;
}

const user1 = await User.create({ name: 'Bill Smith', age: 45, email: 'bill@foo.org' });
try {
  const user2 = await User.create({ name: 'Bill Simpson', age: 38, email: 'bill@foo.org' });
} catch (error: any) {
  // error.message는 'duplicated email'나 'duplicated'가 됩니다
}
```
