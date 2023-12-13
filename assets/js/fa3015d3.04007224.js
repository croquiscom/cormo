"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[709],{4377:(e,s,o)=>{o.r(s),o.d(s,{assets:()=>c,contentTitle:()=>a,default:()=>p,frontMatter:()=>r,metadata:()=>i,toc:()=>d});var n=o(5893),t=o(1151);const r={id:"association",title:"Association"},a=void 0,i={id:"association",title:"Association",description:"See [[#BaseModel.hasMany]], [[#BaseModel.belongsTo]] for more details.",source:"@site/docs/association.md",sourceDirName:".",slug:"/association",permalink:"/cormo/docs/association",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/packages/doc/docs/association.md",tags:[],version:"current",frontMatter:{id:"association",title:"Association"},sidebar:"docs",previous:{title:"Constraint",permalink:"/cormo/docs/constraint"},next:{title:"Callback",permalink:"/cormo/docs/callback"}},c={},d=[{value:"keep data consistent",id:"keep-data-consistent",level:3}];function l(e){const s={code:"code",h3:"h3",p:"p",pre:"pre",...(0,t.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(s.pre,{children:(0,n.jsx)(s.code,{className:"language-coffeescript",children:"class User extends cormo.BaseModel\n  @column 'name', String\n  @column 'age', Number\n\nclass Post extends cormo.BaseModel\n  @column 'title', String\n  @column 'body', String\n\n# one-to-many association\n# this will add 'user_id' to the Post model\nUser.hasMany Post\nPost.belongsTo User\n\n# one-to-many association with 'as'\n# this will add 'parent_post_id' to the Post model\nPost.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'\nPost.belongsTo Post, as: 'parent_post'\n\n# get associated objects\nuser.posts (error, records) ->\n  console.log records\npost.user (error, record) ->\n  console.log record\npost.comments (error, records) ->\n  console.log records\npost.parent_post (error, record) ->\n  console.log record\n\n# returned objects are cached, give true to reload\nuser.posts true, (error, records) ->\n  console.log records\n\n# two ways to create an associated object\nPost.create title: 'first post', body: 'This is the 1st post.', user_id: user.id, (error, post) ->\n  console.log post\n\npost = user.posts.build title: 'first post', body: 'This is the 1st post.'\npost.save (error) ->\n  console.log error\n"})}),"\n",(0,n.jsx)(s.pre,{children:(0,n.jsx)(s.code,{className:"language-javascript",children:"var User = connection.model('User', {\n  name: String,\n  age: Number,\n});\n\nvar Post = connection.model('Post', {\n  title: String,\n  body: String,\n});\n\n// one-to-many association\n// this will add 'user_id' to the Post model\nUser.hasMany(Post);\nPost.belongsTo(User);\n\n// one-to-many association with 'as'\n// this will add 'parent_post_id' to the Post model\nPost.hasMany(Post, { as: 'comments', foreign_key: 'parent_post_id' });\nPost.belongsTo(Post, { as: 'parent_post' });\n\n// get associated objects\nuser.posts(function (error, records) {\n  console.log(records);\n});\npost.user(function (error, record) {\n  console.log(record);\n});\npost.comments(function (error, records) {\n  console.log(records);\n});\npost.parent_post(function (error, record) {\n  console.log(record);\n});\n\n// returned objects are cached, give true to reload\nuser.posts(true, function (error, records) {\n  console.log(records);\n});\n\n// two ways to create an associated object\nPost.create({ title: 'first post', body: 'This is the 1st post.', user_id: user.id }, function (error, post) {\n  console.log(post);\n});\n\nvar post = user.posts.build({ title: 'first post', body: 'This is the 1st post.' });\npost.save(function (error) {\n  console.log(error);\n});\n"})}),"\n",(0,n.jsx)(s.p,{children:"See [[#BaseModel.hasMany]], [[#BaseModel.belongsTo]] for more details."}),"\n",(0,n.jsx)(s.h3,{id:"keep-data-consistent",children:"keep data consistent"}),"\n",(0,n.jsx)(s.p,{children:"CORMO supports foreign key constraints by DBMS for SQL-based DBMS or by framework for MongoDB.\n(CORMO does not guarantee integrity for MongoDB even if using this feature)"}),"\n",(0,n.jsx)(s.p,{children:"To use constraints, give an integrity options on [[#BaseModel.hasMany]]."}),"\n",(0,n.jsx)(s.pre,{children:(0,n.jsx)(s.code,{className:"language-coffeescript",children:"# the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL\"\nUser.hasMany Post, integrity: 'nullify'\n\n# the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT\"\nUser.hasMany Post, integrity: 'restrict'\n\n# the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\"\nUser.hasMany Post, integrity: 'delete'\n\n# no option means no foreign key constraint\n# so there may be a post with invalid user_id\nUser.hasMany Post\n"})}),"\n",(0,n.jsx)(s.pre,{children:(0,n.jsx)(s.code,{className:"language-javascript",children:"// the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL\"\nUser.hasMany(Post, { integrity: 'nullify' });\n\n// the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT\"\nUser.hasMany(Post, { integrity: 'restrict' });\n\n// the same as \"CREATE TABLE posts ( user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\"\nUser.hasMany(Post, { integrity: 'delete' });\n\n// no option means no foreign key constraint\n// so there may be a post with invalid user_id\nUser.hasMany(Post);\n"})})]})}function p(e={}){const{wrapper:s}={...(0,t.a)(),...e.components};return s?(0,n.jsx)(s,{...e,children:(0,n.jsx)(l,{...e})}):l(e)}},1151:(e,s,o)=>{o.d(s,{Z:()=>i,a:()=>a});var n=o(7294);const t={},r=n.createContext(t);function a(e){const s=n.useContext(r);return n.useMemo((function(){return"function"==typeof e?e(s):{...s,...e}}),[s,e])}function i(e){let s;return s=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:a(e.components),n.createElement(r.Provider,{value:s},e.children)}}}]);