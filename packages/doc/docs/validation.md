---
id: validation
title: Validation
---

CORMO validates fields basically based on types.

If a field is invalid, [[#BaseModel::save]] or [[#Query::update]] will return errors like "'&lt;column name&gt;' is not an integer".
If two or more fields are invalid, all errors are returned as a comma seperated string.

If you want custom validations, add a validator using [[#BaseModel.addValidator]].
If a record is invalid, throw an error, or return false or an error string in the validator.

```coffeescript
class User extends cormo.BaseModel
  @column 'name', String
  @column 'age', Number
  @column 'email', String

  @addValidator (record) ->
    if record.age < 18
      return 'too young'

  @addValidator (record) ->
    if record.email and not /^\w+@.+$/.test record.email
      throw new Error 'invalid email'
    return true

User.create name: 'John Doe', age: 10, email: 'invalid', (error, user) ->
  # error.message will be 'invalid email,too young' or 'too young,invalid email'
```
```javascript
var User = connection.model('User', {
  name: String,
  age: Number,
  email: String
});

User.addValidator(function (record) {
  if (record.age<18) {
    return 'too young';
  }
});

User.addValidator(function (record) {
  if (record.email && !/^\w+@.+$/.test(record.email)) {
    throw new Error('invalid email');
  }
  return true;
});

User.create({name: 'John Doe', age: 10, email: 'invalid'}, function (error, user) {
  // error.message will be 'invalid email,too young' or 'too young,invalid email'
});
```

Custom validators are called only when using [[#BaseModel::save]].
