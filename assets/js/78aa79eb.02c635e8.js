"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[707],{2381:(e,n,o)=>{o.r(n),o.d(n,{assets:()=>l,contentTitle:()=>a,default:()=>u,frontMatter:()=>c,metadata:()=>s,toc:()=>i});var t=o(5893),r=o(1151);const c={id:"geospatial",title:"Geospatial"},a=void 0,s={id:"geospatial",title:"Geospatial",description:"Currently, CORMO supports only near query of 2D location in MongoDB, MySQL and PostgreSQL.",source:"@site/docs/geospatial.md",sourceDirName:".",slug:"/geospatial",permalink:"/cormo/docs/geospatial",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/doc/docs/geospatial.md",tags:[],version:"current",frontMatter:{id:"geospatial",title:"Geospatial"},sidebar:"docs",previous:{title:"Callback",permalink:"/cormo/docs/callback"},next:{title:"Miscellaneous",permalink:"/cormo/docs/miscellaneous"}},l={},i=[];function p(e){const n={code:"code",p:"p",pre:"pre",...(0,r.a)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.p,{children:"Currently, CORMO supports only near query of 2D location in MongoDB, MySQL and PostgreSQL."}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-coffeescript",children:"class Place extends cormo.BaseModel\n  @column 'name', String\n  @column 'location', cormo.types.GeoPoint\n\n# create\nPlace.create name: 'Carrier Dome', location: [-76.136131, 43.036240]\n\n# query\nPlace.query().near(location: [-5, 45]).limit(4).exec (error, places) ->\n  console.log places\n"})}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-javascript",children:"var Place = connection.model('Place', {\n  name: String,\n  location: cormo.types.GeoPoint,\n});\n\n// create\nPlace.create({ name: 'Carrier Dome', location: [-76.136131, 43.03624] });\n\n// query\nPlace.query()\n  .near({ location: [-5, 45] })\n  .limit(4)\n  .exec(function (error, places) {\n    console.log(places);\n  });\n"})}),"\n",(0,t.jsx)(n.p,{children:"See [[#Query::near]] for more details."})]})}function u(e={}){const{wrapper:n}={...(0,r.a)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(p,{...e})}):p(e)}},1151:(e,n,o)=>{o.d(n,{Z:()=>s,a:()=>a});var t=o(7294);const r={},c=t.createContext(r);function a(e){const n=t.useContext(c);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function s(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),t.createElement(c.Provider,{value:n},e.children)}}}]);