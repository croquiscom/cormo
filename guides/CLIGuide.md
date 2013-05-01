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
