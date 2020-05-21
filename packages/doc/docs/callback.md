---
id: callback
title: Callback
---

CORMO supports following callbacks:

* [[#BaseModel.afterInitialize]]
* [[#BaseModel.afterFind]]
* [[#BaseModel.beforeValidate]]
* [[#BaseModel.afterValidate]]
* [[#BaseModel.beforeSave]]
* [[#BaseModel.afterSave]]
* [[#BaseModel.beforeCreate]]
* [[#BaseModel.afterCreate]]
* [[#BaseModel.beforeUpdate]]
* [[#BaseModel.afterUpdate]]
* [[#BaseModel.beforeDestroy]]
* [[#BaseModel.afterDestroy]]

You can register a callback as a method name or an anonymous function

```coffeescript
class User extends cormo.BaseModel
  @afterInitialize 'onAfterInitialie'
  onAfterInitialie: ->
    console.log 'initialized'

  @afterCreate ->
    console.log 'created'
```
```javascript
var User = connection.model('User', {});

User.afterInitialize('onAfterInitialie');
User.prototype.onAfterInitialie = function () {
  console.log('initialized');
};

User.afterCreate(function () {
  console.log('created');
});
```

[[#BaseModel::constructor]] or [[#BaseModel.build]] triggers following callbacks:

1. [[#BaseModel.afterInitialize]]

[[#BaseModel.create]] triggers following callbacks:

1. [[#BaseModel.afterInitialize]]
2. [[#BaseModel.beforeValidate]]
3. [[#BaseModel.afterValidate]]
4. [[#BaseModel.beforeSave]]
5. [[#BaseModel.beforeCreate]]
6. [[#BaseModel.afterCreate]]
7. [[#BaseModel.afterSave]]

[[#Query::exec]] triggers following callbacks:

1. [[#BaseModel.afterFind]]
2. [[#BaseModel.afterInitialize]]

[[#BaseModel::save]] on an existing record triggers following callbacks:

1. [[#BaseModel.beforeValidate]]
2. [[#BaseModel.afterValidate]]
3. [[#BaseModel.beforeSave]]
4. [[#BaseModel.beforeUpdate]]
5. [[#BaseModel.afterUpdate]]
6. [[#BaseModel.afterSave]]

[[#BaseModel::destroy]] triggers following callbacks:

1. [[#BaseModel.beforeDestroy]]
2. [[#BaseModel.afterDestroy]]

Note that update or delete records using an [[#Query]] object does not trigger any callbacks.
