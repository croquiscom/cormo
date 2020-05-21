---
id: miscellaneous
title: Miscellaneous
---

Use [[#BaseModel.timestamps]] to add created\_at and updated\_at to the table.

```typescript
User.timestamps();
```
```javascript
User.timestamps();
```
```coffeescript
User.timestamps()
```

If [[#BaseModel.archive]] is true, deleted records are archived in the \_Archive table.

```typescript
User.archive = true;
const count = await User.delete({ age: 27 });
// _Archive will have delete records as
//   { model: 'User', data: <deleted user 1> },
//   { model: 'User', data: <deleted user 2> }, ...
```
```javascript
User.archive = true;
const count = await User.delete({ age: 27 });
// _Archive will have delete records as
//   { model: 'User', data: <deleted user 1> },
//   { model: 'User', data: <deleted user 2> }, ...
```
```coffeescript
User.archive = true
count = await User.delete age: 27
# _Archive will have delete records as
#   { model: 'User', data: <deleted user 1> },
#   { model: 'User', data: <deleted user 2> }, ...
```
