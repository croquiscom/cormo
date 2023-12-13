"use strict";(self.webpackChunkcormo_doc=self.webpackChunkcormo_doc||[]).push([[323],{4995:(r,e,s)=>{s.r(e),s.d(e,{assets:()=>i,contentTitle:()=>d,default:()=>l,frontMatter:()=>c,metadata:()=>n,toc:()=>u});var t=s(5893),o=s(1151);const c={id:"aggregation",title:"Aggregation"},d=void 0,n={id:"aggregation",title:"Aggregation",description:"CORMO supports some basic aggregation operations via Query#group.",source:"@site/docs/aggregation.md",sourceDirName:".",slug:"/aggregation",permalink:"/cormo/docs/aggregation",draft:!1,unlisted:!1,editUrl:"https://github.com/croquiscom/cormo/tree/main/packages/doc/docs/aggregation.md",tags:[],version:"current",frontMatter:{id:"aggregation",title:"Aggregation"},sidebar:"docs",previous:{title:"Query",permalink:"/cormo/docs/query"},next:{title:"Constraint",permalink:"/cormo/docs/constraint"}},i={},u=[];function a(r){const e={a:"a",p:"p",...(0,o.a)(),...r.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(e.p,{children:["CORMO supports some basic aggregation operations via ",(0,t.jsx)(e.a,{href:"/cormo/api/cormo/interfaces/queryarray.html#group",children:"Query#group"}),"."]}),"\n",(0,t.jsxs)("table",{class:"table table-bordered",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{children:[(0,t.jsx)("th",{children:"Description"}),(0,t.jsx)("th",{children:"CORMO"}),(0,t.jsx)("th",{children:"SQL"}),(0,t.jsx)("th",{children:"MongoDB"})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Count all"}),(0,t.jsx)("td",{children:"Order.group(null, { count: { $sum: 1 } })"}),(0,t.jsxs)("td",{children:["SELECT COUNT(*) AS count",(0,t.jsx)("br",{}),"FROM orders"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id",":null",",count:{$sum:1}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Sum all"}),(0,t.jsx)("td",{children:"Order.group(null, { total: { $sum: '$price' } })"}),(0,t.jsxs)("td",{children:["SELECT SUM(price) AS total",(0,t.jsx)("br",{}),"FROM orders"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id",":null",",total:{$sum:'$price'}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Only for filtered records"}),(0,t.jsxs)("td",{children:["Order.where({ price: { $lt: 10 } })",(0,t.jsx)("br",{}),".group(null, { count: { $sum: 1 }, total: { $sum: '$price' } })"]}),(0,t.jsxs)("td",{children:["SELECT COUNT(*) AS count, SUM(price) AS total",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"WHERE price<10"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$match:{price:{$lt:10}}},",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id",":null",",count:{$sum:1},total:{$sum:'$price'}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Grouping"}),(0,t.jsx)("td",{children:"Order.group('customer', { count: { $sum: 1 }, total: { $sum: '$price' } })"}),(0,t.jsxs)("td",{children:["SELECT customer, COUNT(*) AS count, SUM(price) AS total",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:'$customer',count:{$sum:1},total:{$sum:'$price'}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Sort by group column"}),(0,t.jsxs)("td",{children:["Order.group('customer', { total: { $sum: '$price' } })",(0,t.jsx)("br",{}),".order('customer')"]}),(0,t.jsxs)("td",{children:["SELECT customer, SUM(price) AS total",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer",(0,t.jsx)("br",{}),"ORDER BY customer"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:'$customer',total:{$sum:'$price'}}},",(0,t.jsx)("br",{}),"\xa0\xa0{$sort:{_id:1}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Sort by aggregated column"}),(0,t.jsxs)("td",{children:["Order.group('customer', { total: { $sum: '$price' } })",(0,t.jsx)("br",{}),".order('total')"]}),(0,t.jsxs)("td",{children:["SELECT customer, SUM(price) AS total",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer",(0,t.jsx)("br",{}),"ORDER BY total"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:'$customer',total:{$sum:'$price'}}},",(0,t.jsx)("br",{}),"\xa0\xa0{$sort:{total:1}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Condition on aggregated column"}),(0,t.jsxs)("td",{children:["Order.group('customer', { count: { $sum: 1 } })",(0,t.jsx)("br",{}),".where({ count: { $gte: 3 } })"]}),(0,t.jsxs)("td",{children:["SELECT customer, COUNT(*) AS count",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer",(0,t.jsx)("br",{}),"HAVING count>=3"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:'$customer',count:{$sum:1}}},",(0,t.jsx)("br",{}),"\xa0\xa0{$match:{count:{$gte:3}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Grouping by multiple columns"}),(0,t.jsx)("td",{children:"Order.group('customer date', { count: { $sum: 1 } })"}),(0,t.jsxs)("td",{children:["SELECT customer, date, COUNT(*) AS count",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer, date"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:{customer:'$customer', date:'$date'},count:{$sum:1}}}",(0,t.jsx)("br",{}),"])"]})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:"Min/Max functions"}),(0,t.jsx)("td",{children:"Order.group('customer', { min_price: { $min: '$price' }, max_price: { $max: '$price' } })"}),(0,t.jsxs)("td",{children:["SELECT customer, MIN(price) AS min_price, MAX(price) AS max_price",(0,t.jsx)("br",{}),"FROM orders",(0,t.jsx)("br",{}),"GROUP BY customer"]}),(0,t.jsxs)("td",{children:["db.orders.aggregate([",(0,t.jsx)("br",{}),"\xa0\xa0{$group:{_id:'$customer',min_price:{$min:'$price'},max_price:{$max:'$price'}}}",(0,t.jsx)("br",{}),"])"]})]})]})]})]})}function l(r={}){const{wrapper:e}={...(0,o.a)(),...r.components};return e?(0,t.jsx)(e,{...r,children:(0,t.jsx)(a,{...r})}):a(r)}},1151:(r,e,s)=>{s.d(e,{Z:()=>n,a:()=>d});var t=s(7294);const o={},c=t.createContext(o);function d(r){const e=t.useContext(c);return t.useMemo((function(){return"function"==typeof r?r(e):{...e,...r}}),[e,r])}function n(r){let e;return e=r.disableParentContext?"function"==typeof r.components?r.components(o):r.components||o:d(r.components),t.createElement(c.Provider,{value:e},r.children)}}}]);