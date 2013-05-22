CORMO supports following callbacks:

* [[#ModelCallback.afterInitialize]]
* [[#ModelCallback.afterFind]]
* [[#ModelCallback.beforeValidate]]
* [[#ModelCallback.afterValidate]]
* [[#ModelCallback.beforeSave]]
* [[#ModelCallback.afterSave]]
* [[#ModelCallback.beforeCreate]]
* [[#ModelCallback.afterCreate]]
* [[#ModelCallback.beforeUpdate]]
* [[#ModelCallback.afterUpdate]]
* [[#ModelCallback.beforeDestroy]]
* [[#ModelCallback.afterDestroy]]

You can register a callback as a method name or an anonymous function

```coffeescript
class User extends cormo.Model
  @afterInitialize 'onAfterInitialie'
  onAfterInitialie: ->
    console.log 'initialized'

  @afterCreate ->
    console.log 'created'
```

[[#Model::constructor]] or [[#Model.build]] triggers following callbacks:

1. [[#ModelCallback.afterInitialize]]

[[#ModelPersistence.create]] triggers following callbacks:

1. [[#ModelCallback.afterInitialize]]
2. [[#ModelCallback.beforeValidate]]
3. [[#ModelCallback.afterValidate]]
4. [[#ModelCallback.beforeSave]]
5. [[#ModelCallback.beforeCreate]]
6. [[#ModelCallback.afterCreate]]
7. [[#ModelCallback.afterSave]]

[[#Query::exec]] triggers following callbacks:

1. [[#ModelCallback.afterFind]]
2. [[#ModelCallback.afterInitialize]]

[[#ModelPersistence::save]] on an existing record triggers following callbacks:

1. [[#ModelCallback.beforeValidate]]
2. [[#ModelCallback.afterValidate]]
3. [[#ModelCallback.beforeSave]]
4. [[#ModelCallback.beforeUpdate]]
5. [[#ModelCallback.afterUpdate]]
6. [[#ModelCallback.afterSave]]

[[#Model::destroy]] triggers following callbacks:

1. [[#ModelCallback.beforeDestroy]]
2. [[#ModelCallback.afterDestroy]]

Note that update or delete records using an [[#Query]] object does not trigger any callbacks.
