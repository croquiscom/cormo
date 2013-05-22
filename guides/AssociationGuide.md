```coffeescript
class User extends cormo.Model
  @column 'name', String
  @column 'age', Number

class Post extends cormo.Model
  @column 'title', String
  @column 'body', String

# one-to-many association
# this will add 'user_id' to the Post model
User.hasMany Post
Post.belongsTo User

# one-to-many association with 'as'
# this will add 'parent_post_id' to the Post model
Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
Post.belongsTo Post, as: 'parent_post'

# get associated objects
user.posts (error, records) ->
  console.log records
post.user (error, record) ->
  console.log record
post.comments (error, records) ->
  console.log records
post.parent_post (error, record) ->
  console.log record

# returned objects are cached, give true to reload
user.posts true, (error, records) ->
  console.log records

# two ways to create an associated object
Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
  console.log post

post = user.posts.build title: 'first post', body: 'This is the 1st post.'
post.save (error) ->
  console.log error
```

See [[#Model.hasMany]], [[#Model.belongsTo]] for more details.

### keep data consistent

CORMO supports foreign key constraints by DBMS for SQL-based DBMS or by framework for MongoDB.
(CORMO does not guarantee integrity for MongoDB even if using this feature)

To use constraints, give an integrity options on [[#Model.hasMany]].

```coffeescript
# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL"
User.hasMany Post, integrity: 'nullify'

# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT"
User.hasMany Post, integrity: 'restrict'

# the same as "CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
User.hasMany Post, integrity: 'delete'

# no option means no foreign key constraint
# so there may be a post with invalid user_id
User.hasMany Post
```
