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
$ cormo console -l coffee-script/register -l model.coffee
cormo> user = User.create name: 'croquis.com', age: 2
{ name: 'croquis.com',
  age: 2,
  id: '5180f6850c8f82829d000003' }
cormo> User.find(user.id).select('name').exec()
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

## Run synchronously

If the evaluated result is a promise, console waits to finish the execution ant returns its result.
All CORMO methods that have a callback returns a promise.

If the evaluated result is a [[#Query]], console will call 'exec' and return its result.

```bash
cormo> User.find(user.id).select('name')
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

If a method provides only a node-style callback, you can use '$' to execute it synchronously.

```bash
cormo> fs.readFile 'model.coffee', 'utf-8', $
'cormo = require \'./lib\'\n\nnew cormo.Connection \'mongodb\', database: \'test\'\n\nclass User extends cormo.Model\n  @column \'name\', String\n  @column \'age\', Number\n'
```
