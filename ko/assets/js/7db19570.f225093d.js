"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[244],{5970:(n,e,o)=>{o.r(e),o.d(e,{assets:()=>a,contentTitle:()=>i,default:()=>m,frontMatter:()=>c,metadata:()=>r,toc:()=>l});var t=o(5893),s=o(1151);const c={},i=void 0,r={id:"define-connection",title:"define-connection",description:"\ubaa8\ub378\uc744 \uc815\uc758\ud558\uae30\uc5d0 \uc55e\uc11c \ub370\uc774\ud130\ubca0\uc774\uc2a4\ub85c\uc758 \uc5f0\uacb0\uc744 \uc0dd\uc131\ud574\uc57c \ud569\ub2c8\ub2e4.",source:"@site/i18n/ko/docusaurus-plugin-content-docs/current/define-connection.md",sourceDirName:".",slug:"/define-connection",permalink:"/cormo/ko/docs/define-connection",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/packages/doc/docs/define-connection.md",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"getting-started",permalink:"/cormo/ko/docs/getting-started"},next:{title:"define-models",permalink:"/cormo/ko/docs/define-models"}},a={},l=[];function d(n){const e={a:"a",code:"code",p:"p",pre:"pre",...(0,s.a)(),...n.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(e.p,{children:["\ubaa8\ub378\uc744 \uc815\uc758\ud558\uae30\uc5d0 \uc55e\uc11c \ub370\uc774\ud130\ubca0\uc774\uc2a4\ub85c\uc758 ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/classes/connection.html",children:"\uc5f0\uacb0"}),"\uc744 \uc0dd\uc131\ud574\uc57c \ud569\ub2c8\ub2e4."]}),"\n",(0,t.jsx)(e.pre,{children:(0,t.jsx)(e.code,{className:"language-typescript",children:"import * as cormo from 'cormo';\n\nconst connection = new cormo.MySQLConnection({ database: 'test' });\n"})}),"\n",(0,t.jsxs)(e.p,{children:["\uac01 \ub370\uc774\ud130\ubca0\uc774\uc2a4 \uc2dc\uc2a4\ud15c\ubcc4 \uc124\uc815\uc740\n",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/interfaces/mysqlconnectionsettings.html",children:"MySQLConnectionSettings"}),", ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/interfaces/mongodbconnectionsettings.html",children:"MongoDBConnectionSettings"}),", ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/interfaces/sqlite3connectionsettings.html",children:"SQLite3ConnectionSettings"}),", ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/interfaces/postgresqlconnectionsettings.html",children:"PostgreSQLConnectionSettings"}),"\uc5d0\uc11c \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."]}),"\n",(0,t.jsxs)(e.p,{children:["\uac01 \ub370\uc774\ud130\ubca0\uc774\uc2a4 \uc2dc\uc2a4\ud15c\uc5d0 \ub9de\ub294 \ub4dc\ub77c\uc774\ubc84(MySQL\uc740 ",(0,t.jsx)(e.a,{href:"https://www.npmjs.com/package/mysql2",children:"mysql2"})," \ub610\ub294 ",(0,t.jsx)(e.a,{href:"https://www.npmjs.com/package/mysql",children:"mysql"}),", MongoDB\ub294 ",(0,t.jsx)(e.a,{href:"https://www.npmjs.com/package/mongodb",children:"mongodb"}),", SQLite3\ub294 ",(0,t.jsx)(e.a,{href:"https://www.npmjs.com/package/sqlite3",children:"sqlite3"}),", PostgreSQL\ub294 ",(0,t.jsx)(e.a,{href:"https://www.npmjs.com/package/pg",children:"pg"}),")\ub97c \uc124\uce58\ud574\uc57c \ud569\ub2c8\ub2e4. \uadf8\ub807\uc9c0 \uc54a\uc73c\uba74 ",(0,t.jsx)(e.code,{children:"Install mysql module to use this adapter"}),"\uc640 \uac19\uc740 \uc5d0\ub7ec\uc640 \ud568\uaed8 \ud504\ub85c\uc138\uc2a4\uac00 \uc885\ub8cc\ub429\ub2c8\ub2e4."]}),"\n",(0,t.jsxs)(e.p,{children:["\ub7f0\ud0c0\uc784\uc5d0 \ud658\uacbd\ubcc4\ub85c \ub2e4\ub978 \ub370\uc774\ud130\ubca0\uc774\uc2a4 \uc2dc\uc2a4\ud15c\uc744 \uc0ac\uc6a9\ud558\ub294 \uacbd\uc6b0 ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/classes/connection.html",children:"Connection"})," \ud074\ub798\uc2a4\ub97c \uc9c1\uc811 \uc0ac\uc6a9\ud569\ub2c8\ub2e4."]}),"\n",(0,t.jsx)(e.pre,{children:(0,t.jsx)(e.code,{className:"language-typescript",children:"let Config;\nif (process.env.NODE_ENV === 'test') {\n  Config = {\n    database_type: 'sqlite3',\n    database_settings: {\n      database: __dirname + '/test.sqlite3',\n    },\n  };\n} else {\n  Config = {\n    database_type: 'mysql',\n    database_settings: {\n      host: 'db.example.com',\n      database: 'cormo',\n    },\n  };\n}\nconst connection = new cormo.Connection(Config.database_type, Config.database_settings);\n"})}),"\n",(0,t.jsx)(e.p,{children:"\ubaa8\ub378\uc744 \uc815\uc758\ud558\uba74, \ubaa8\ub378\uc740 \uc790\ub3d9\uc73c\ub85c \ub9c8\uc9c0\ub9c9 Connection \uc778\uc2a4\ud134\uc2a4\uc5d0 \uc5f0\uacb0\ub429\ub2c8\ub2e4. \uc790\ub3d9 \uc5f0\uacb0\uc744 \uc6d0\ud558\uc9c0 \uc54a\ub294 \uacbd\uc6b0 (\uc608. \ub2e4\uc218\uc758 \ucee4\ub125\uc158\uc744 \uc0ac\uc6a9) is_default\ub97c false\ub85c \uc124\uc815\ud569\ub2c8\ub2e4."}),"\n",(0,t.jsx)(e.pre,{children:(0,t.jsx)(e.code,{className:"language-typescript",children:"const mysql = new cormo.MySQLConnection({ database: 'test', is_default: false });\nconst mongodb = new cormo.MongoDBConnection({ database: 'test', is_default: false });\n\n@cormo.Model({ connection: mongodb })\nclass User extends cormo.BaseModel {\n  @cormo.Column(String)\n  public name?: string | null;\n\n  @cormo.Column(Number)\n  public age?: number | null;\n}\n\n@cormo.Model({ connection: mysql })\nclass Post extends cormo.BaseModel {\n  @cormo.Column(String)\n  public title?: string | null;\n\n  @cormo.Column(String)\n  public body?: string | null;\n}\n"})}),"\n",(0,t.jsx)(e.p,{children:"Connection \uc778\uc2a4\ud134\uc2a4\ub294 \uc5b4\ub5a4 \uba54\uc18c\ub4dc \ud638\ucd9c\uc774 \uc5c6\uc5b4\ub3c4 \ub370\uc774\ud130\ubca0\uc774\uc2a4 \uc11c\ubc84\uc5d0 \uc790\ub3d9\uc73c\ub85c \uc5f0\uacb0\ud569\ub2c8\ub2e4."})]})}function m(n={}){const{wrapper:e}={...(0,s.a)(),...n.components};return e?(0,t.jsx)(e,{...n,children:(0,t.jsx)(d,{...n})}):d(n)}},1151:(n,e,o)=>{o.d(e,{Z:()=>r,a:()=>i});var t=o(7294);const s={},c=t.createContext(s);function i(n){const e=t.useContext(c);return t.useMemo((function(){return"function"==typeof n?n(e):{...e,...n}}),[e,n])}function r(n){let e;return e=n.disableParentContext?"function"==typeof n.components?n.components(s):n.components||s:i(n.components),t.createElement(c.Provider,{value:e},n.children)}}}]);