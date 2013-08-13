# CORMO console

## Run

```bash
$ cormo console
cormo> 1+1
2
cormo> 
```

## Load module

```coffeescript
cormo = require 'cormo'

new cormo.Connection 'mongodb', database: 'test'

class User extends cormo.Model
  @column 'name', String
  @column 'age', Number
```

```bash
$ cormo console -l model.coffee
cormo> User.create name: 'croquis.com', age: 2
undefined
cormo> User.where (error, users) -> console.log users[0]
<..query object..>
cormo> { name: 'croquis.com', age: 2, id: '5180f5ad0c8f82829d000002' }
```

## Run synchronously

If you give '$' in place of callback, console waits to finish the execution ant returns its result.

```bash
$ cormo console -l model.coffee
cormo> user = User.create name: 'croquis.com', age: 2, $
{ name: 'croquis.com',
  age: 2,
  id: '5180f6850c8f82829d000003' }
cormo> User.find(user.id).select('name').exec $
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

For CORMO methods, you can omit '$'.
And for Query objects, you can also omit calling 'exec'.

```bash
cormo> user = User.create name: 'croquis.com', age: 2
{ name: 'croquis.com',
  age: 2,
  id: '5180f6850c8f82829d000003' }
cormo> User.find(user.id).select('name')
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

If you want omit '$' when calling your methods, wrap it with 'cormo.console_future.execute'.

```coffeescript
User.createUser = (name, age, callback) ->
  cormo.console_future.execute callback, (callback) =>
     User.create name: name, age: age, callback
```

```bash
cormo> user = User.createUser 'croquis.com', 2
```

'cormo.console_future.execute' does not do anything special when you use methods not on the console.
