Currently, CORMO supports only near query of 2D location in MongoDB, MySQL and PostgreSQL.

```coffeescript
class Place extends cormo.BaseModel
  @column 'name', String
  @column 'location', cormo.types.GeoPoint

# create
Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]

# query
Place.query().near(location: [-5, 45]).limit(4).exec (error, places) ->
  console.log places
```
```javascript
var Place = connection.model('Place', {
  name: String,
  location: cormo.types.GeoPoint
});

// create
Place.create({name: 'Carrier Dome', location: [-76.136131, 43.036240]});

// query
Place.query().near({location: [-5, 45]}).limit(4).exec(function (error, places) {
  console.log(places);
});
```

See [[#Query::near]] for more details.
