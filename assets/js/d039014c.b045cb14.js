"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[111],{3817:(e,t,s)=>{s.r(t),s.d(t,{assets:()=>d,contentTitle:()=>c,default:()=>u,frontMatter:()=>r,metadata:()=>o,toc:()=>l});var a=s(5893),n=s(1151);const r={id:"miscellaneous",title:"Miscellaneous"},c=void 0,o={id:"miscellaneous",title:"Miscellaneous",description:"Use [[#BaseModel.timestamps]] to add createdat and updatedat to the table.",source:"@site/docs/miscellaneous.md",sourceDirName:".",slug:"/miscellaneous",permalink:"/cormo/docs/miscellaneous",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/packages/doc/docs/miscellaneous.md",tags:[],version:"current",frontMatter:{id:"miscellaneous",title:"Miscellaneous"},sidebar:"docs",previous:{title:"Geospatial",permalink:"/cormo/docs/geospatial"},next:{title:"Validation",permalink:"/cormo/docs/validation"}},d={},l=[];function i(e){const t={code:"code",p:"p",pre:"pre",...(0,n.a)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.p,{children:"Use [[#BaseModel.timestamps]] to add created_at and updated_at to the table."}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-typescript",children:"User.timestamps();\n"})}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-javascript",children:"User.timestamps();\n"})}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-coffeescript",children:"User.timestamps()\n"})}),"\n",(0,a.jsx)(t.p,{children:"If [[#BaseModel.archive]] is true, deleted records are archived in the _Archive table."}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-typescript",children:"User.archive = true;\nconst count = await User.delete({ age: 27 });\n// _Archive will have delete records as\n//   { model: 'User', data: <deleted user 1> },\n//   { model: 'User', data: <deleted user 2> }, ...\n"})}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-javascript",children:"User.archive = true;\nconst count = await User.delete({ age: 27 });\n// _Archive will have delete records as\n//   { model: 'User', data: <deleted user 1> },\n//   { model: 'User', data: <deleted user 2> }, ...\n"})}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-coffeescript",children:"User.archive = true\ncount = await User.delete age: 27\n# _Archive will have delete records as\n#   { model: 'User', data: <deleted user 1> },\n#   { model: 'User', data: <deleted user 2> }, ...\n"})})]})}function u(e={}){const{wrapper:t}={...(0,n.a)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(i,{...e})}):i(e)}},1151:(e,t,s)=>{s.d(t,{Z:()=>o,a:()=>c});var a=s(7294);const n={},r=a.createContext(n);function c(e){const t=a.useContext(r);return a.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(n):e.components||n:c(e.components),a.createElement(r.Provider,{value:t},e.children)}}}]);