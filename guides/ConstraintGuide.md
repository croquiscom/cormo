Currently CORMO supports 'unique' and 'required'(not null).

'unique' is supported on the database layer.
If unique constraint is violated, 'duplicated &lt;column name&gt;' error will be throwed.
(In some adpater, just 'duplicated' will be throwed.)

'required' is supported on the CORMO layer(while validating).
If required constraint is violated, '&lt;column name&gt;' is required' error will be throwed.

The column unique but not required can have multiple null values.

```coffeescript
class User extends cormo.Model
  @column 'name', type: String, required: true
  @column 'age', type: Number, required: true
  @column 'email', type: String, unique: true, required: true

User.create name: 'Bill Smith', age: 45, email: 'bill@foo.org', (error, user1) ->
  User.create name: 'Bill Simpson', age: 38, email: 'bill@foo.org', (error, user2) ->
    # error.message will be 'duplicated email' or 'duplicated'
```
```javascript
var User = connection.model('User', {
  name: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, unique: true, required: true }
});

User.create({ name: 'Bill Smith', age: 45, email: 'bill@foo.org' }, function (error, user1) {
  User.create({ name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, function (error, user2) {
    // error.message will be 'duplicated email' or 'duplicated'
  });
});
```
