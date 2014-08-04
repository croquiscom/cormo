# CORMO console

## Run

```
$ cormo console
cormo> 1+1
2
cormo>
```

## Load module

```coffeescript
# model.coffee

cormo = require 'cormo'

new cormo.Connection 'mongodb', database: 'test'

class User extends cormo.Model
  @column 'name', String
  @column 'age', Number
```

```
$ cormo console -l coffee-script/register -l model.coffee
cormo> user = User.create name: 'croquis.com', age: 2
{ name: 'croquis.com',
  age: 2,
  id: '5180f6850c8f82829d000003' }
cormo> User.find(user.id).select('name').exec()
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

## Expose your objects

```coffeescript
# calc.coffee
cormo = require 'cormo'
cormo.console.public.CalcService =
  add: (a, b) -> a + b
```

```
$ cormo console -l coffee-script/register -l calc.coffee
cormo> CalcService.add 1, 2
3
```


## Run synchronously

If the evaluated result is a thenable(i.e. has a then method),
console waits to finish the execution and returns its result.

All CORMO methods that have a callback return thenables, and all [[#Query]] are thenables.

```
cormo> User.find(user.id).select('name')
{ name: 'croquis.com',
  id: '5180f6850c8f82829d000003' }
```

If a method provides only a node-style callback, you can use '$' to execute it synchronously.

```
cormo> fs.readFile 'model.coffee', 'utf-8', $
'cormo = require \'cormo\'\n\nnew cormo.Connection \'mongodb\', database: \'test\'\n\nclass User extends cormo.Model\n  @column \'name\', String\n  @column \'age\', Number\n'
```

# Remote CORMO console

You can run a console server and connect to it via socket.

## Run server

```coffeescript
# server.coffee

cormo = require 'cormo'
net = require 'net'
net.createServer (socket) ->
  cormo.console.startCoffee socket: socket
  .on 'exit', ->
    socket.end()
.on 'error', (->)
.listen 3001
```

```
$ coffee server.coffee
```

## Connect to a remote CORMO console

```
$ cormo remote-console 3001
cormo> 1+1
2
```
