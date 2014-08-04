Use [[#ModelTimestamp.timestamps]] to add created\_at and updated\_at to the table.

```coffeescript
User.timestamps()
```
```javascript
User.timestamps();
```

If [[#Model.archive]] is true, deleted records are archived in the \_Archive table.

```coffeescript
User.archive = true
User.delete age: 27, (error, count) ->
  # _Archive will have delete records as
  #   { model: 'User', data: <deleted user 1> },
  #   { model: 'User', data: <deleted user 2> }, ...
```
```javascript
User.archive = true;
User.delete({ age: 27 }, function (error, count) {
  // _Archive will have delete records as
  //   { model: 'User', data: <deleted user 1> },
  //   { model: 'User', data: <deleted user 2> }, ...
});
```
