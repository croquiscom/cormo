"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[321],{9071:(e,l,n)=>{n.r(l),n.d(l,{assets:()=>t,contentTitle:()=>r,default:()=>f,frontMatter:()=>i,metadata:()=>s,toc:()=>c});var o=n(4848),a=n(8453);const i={id:"callback",title:"Callback"},r=void 0,s={id:"callback",title:"Callback",description:"CORMO supports following callbacks:",source:"@site/i18n/ko/docusaurus-plugin-content-docs/current/callback.md",sourceDirName:".",slug:"/callback",permalink:"/cormo/ko/docs/callback",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/doc/docs/callback.md",tags:[],version:"current",frontMatter:{id:"callback",title:"Callback"},sidebar:"docs",previous:{title:"Association",permalink:"/cormo/ko/docs/association"},next:{title:"Geospatial",permalink:"/cormo/ko/docs/geospatial"}},t={},c=[];function d(e){const l={code:"code",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,a.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(l.p,{children:"CORMO supports following callbacks:"}),"\n",(0,o.jsxs)(l.ul,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterInitialize]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterFind]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeSave]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterSave]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeCreate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterCreate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeUpdate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterUpdate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeDestroy]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterDestroy]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"You can register a callback as a method name or an anonymous function"}),"\n",(0,o.jsx)(l.pre,{children:(0,o.jsx)(l.code,{className:"language-coffeescript",children:"class User extends cormo.BaseModel\n  @afterInitialize 'onAfterInitialie'\n  onAfterInitialie: ->\n    console.log 'initialized'\n\n  @afterCreate ->\n    console.log 'created'\n"})}),"\n",(0,o.jsx)(l.pre,{children:(0,o.jsx)(l.code,{className:"language-javascript",children:"var User = connection.model('User', {});\n\nUser.afterInitialize('onAfterInitialie');\nUser.prototype.onAfterInitialie = function () {\n  console.log('initialized');\n};\n\nUser.afterCreate(function () {\n  console.log('created');\n});\n"})}),"\n",(0,o.jsx)(l.p,{children:"[[#BaseModel::constructor]] or [[#BaseModel.build]] triggers following callbacks:"}),"\n",(0,o.jsxs)(l.ol,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterInitialize]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"[[#BaseModel.create]] triggers following callbacks:"}),"\n",(0,o.jsxs)(l.ol,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterInitialize]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeSave]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeCreate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterCreate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterSave]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"[[#Query::exec]] triggers following callbacks:"}),"\n",(0,o.jsxs)(l.ol,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterFind]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterInitialize]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"[[#BaseModel::save]] on an existing record triggers following callbacks:"}),"\n",(0,o.jsxs)(l.ol,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterValidate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeSave]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeUpdate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterUpdate]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterSave]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"[[#BaseModel::destroy]] triggers following callbacks:"}),"\n",(0,o.jsxs)(l.ol,{children:["\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.beforeDestroy]]"}),"\n",(0,o.jsx)(l.li,{children:"[[#BaseModel.afterDestroy]]"}),"\n"]}),"\n",(0,o.jsx)(l.p,{children:"Note that update or delete records using an [[#Query]] object does not trigger any callbacks."})]})}function f(e={}){const{wrapper:l}={...(0,a.R)(),...e.components};return l?(0,o.jsx)(l,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}},8453:(e,l,n)=>{n.d(l,{R:()=>r,x:()=>s});var o=n(6540);const a={},i=o.createContext(a);function r(e){const l=o.useContext(i);return o.useMemo((function(){return"function"==typeof e?e(l):{...l,...e}}),[l,e])}function s(e){let l;return l=e.disableParentContext?"function"==typeof e.components?e.components(a):e.components||a:r(e.components),o.createElement(i.Provider,{value:l},e.children)}}}]);