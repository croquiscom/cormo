---
id: constraint
title: Constraint
---

Currently CORMO supports 'unique' and 'required'(not null).

'unique' is supported on the database layer.
If unique constraint is violated, 'duplicated &lt;column name&gt;' error will be throwed.
(In some adpater, just 'duplicated' will be throwed.)

'required' is supported on the CORMO layer(while validating) or the database layer.
If required constraint is violated, '&lt;column name&gt;' is required' error will be throwed.

The column unique but not required can have multiple null values.

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
  // error.message will be 'duplicated email' or 'duplicated'
}
```
