"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[493],{7057:(e,n,o)=>{o.r(n),o.d(n,{assets:()=>l,contentTitle:()=>c,default:()=>m,frontMatter:()=>r,metadata:()=>i,toc:()=>d});var s=o(5893),t=o(1151);const r={id:"define-models",title:"Define Models"},c=void 0,i={id:"define-models",title:"Define Models",description:"You can define Models by extending BaseModel, or using Connection#models.",source:"@site/docs/define-models.md",sourceDirName:".",slug:"/define-models",permalink:"/cormo/docs/define-models",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/packages/doc/docs/define-models.md",tags:[],version:"current",frontMatter:{id:"define-models",title:"Define Models"},sidebar:"docs",previous:{title:"Define Connection",permalink:"/cormo/docs/define-connection"},next:{title:"Create Records",permalink:"/cormo/docs/create-records"}},l={},d=[{value:"types",id:"types",level:2},{value:"type options",id:"type-options",level:3}];function a(e){const n={a:"a",code:"code",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",ul:"ul",...(0,t.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)(n.p,{children:["You can define Models by extending ",(0,s.jsx)(n.a,{href:"/cormo/api/cormo/classes/basemodel.html",children:"BaseModel"}),", or using ",(0,s.jsx)(n.a,{href:"/cormo/api/cormo/classes/connection.html#models",children:"Connection#models"}),"."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-typescript",children:"class User extends cormo.BaseModel {\n  name?: string;\n  age?: number;\n}\n\nUser.column('name', String);\nUser.column('age', cormo.types.Integer);\n\n// or if you don't want to use class keyword\nconst User = connection.model('User', {\n  name: String,\n  age: cormo.types.Integer,\n});\n\n// or if you want to use TypeScript decorators\n@cormo.Model()\nclass User extends cormo.BaseModel {\n  @cormo.Column(String)\n  name?: string;\n\n  @cormo.Column(cormo.types.Integer)\n  age?: number;\n}\n"})}),"\n",(0,s.jsx)(n.p,{children:"You can pass an object with type property instead of a type class.\nUse this form to give additional options."}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-typescript",children:"User.column('name', { type: String, required: true });\nUser.column('age', { type: cormo.types.Integer, description: 'age of the user' });\n"})}),"\n",(0,s.jsx)(n.h2,{id:"types",children:"types"}),"\n",(0,s.jsxs)(n.p,{children:["You can use any of CORMO type classes(e.g. cormo.types.String), strings(e.g. ",(0,s.jsx)(n.code,{children:"'string'"}),"), or native JavaScript Function(e.g. String) to specify a type."]}),"\n",(0,s.jsx)(n.p,{children:"Currently supported types:"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesstring.html",children:"types.String"})," ('string', String)"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesnumber.html",children:"types.Number"})," ('number', Number)"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesboolean.html",children:"types.Boolean"})," ('boolean', Boolean)"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesinteger.html",children:"types.Integer"})," ('integer')"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesdate.html",children:"types.Date"})," ('date', Date)"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesgeopoint.html",children:"types.GeoPoint"})," ('geopoint')","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"MySQL, MonogoDB, PostgreSQL only"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypesobject.html",children:"types.Object"})," ('object', Object)","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"Objects are stored as a JSON string in SQL adapters."}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.a,{href:"/cormo/api/cormo/interfaces/cormotypestext.html",children:"types.Text"})," ('text')","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"Use for long string content in SQL adapters."}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,s.jsx)(n.h3,{id:"type-options",children:"type options"}),"\n",(0,s.jsx)(n.p,{children:"You can give options for types in some adapters."}),"\n",(0,s.jsx)(n.p,{children:"To specify length for string type in MySQL or PostgreSQL, you should do"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-typescript",children:"Model.column('method_1', cormo.types.String(50));\n// or\nModel.column('method_2', 'string(50)');\n"})}),"\n",(0,s.jsxs)(n.p,{children:["Please note that you must use ",(0,s.jsx)(n.code,{children:"cormo.types.String"}),", not ",(0,s.jsx)(n.code,{children:"String"}),"."]})]})}function m(e={}){const{wrapper:n}={...(0,t.a)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(a,{...e})}):a(e)}},1151:(e,n,o)=>{o.d(n,{Z:()=>i,a:()=>c});var s=o(7294);const t={},r=s.createContext(t);function c(e){const n=s.useContext(r);return s.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function i(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:c(e.components),s.createElement(r.Provider,{value:n},e.children)}}}]);