---
id: aggregation
title: Aggregation
---

CORMO supports some basic aggregation operations via [Query#group](/cormo/api/cormo/interfaces/queryarray.html#group).

<table class='table table-bordered'><thead><tr>
  <th>Description</th><th>CORMO</th><th>SQL</th><th>MongoDB</th>
</tr></thead><tbody>

<tr>
<td>Count all</td>
<td>Order.group(null, { count: { $sum: 1 } })</td>
<td>SELECT COUNT(*) AS count<br>FROM orders</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:null,count:{$sum:1}}}<br>])</td>
</tr>

<tr>
<td>Sum all</td>
<td>Order.group(null, { total: { $sum: '$price' } })</td>
<td>SELECT SUM(price) AS total<br>FROM orders</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:null,total:{$sum:'$price'}}}<br>])</td>
</tr>

<tr>
<td>Only for filtered records</td>
<td>Order.where({ price: { $lt: 10 } })<br>.group(null, { count: { $sum: 1 }, total: { $sum: '$price' } })</td>
<td>SELECT COUNT(*) AS count, SUM(price) AS total<br>FROM orders<br>WHERE price&lt;10</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$match:{price:{$lt:10}}},<br>&nbsp;&nbsp;{$group:{_id:null,count:{$sum:1},total:{$sum:'$price'}}}<br>])</td>
</tr>

<tr>
<td>Grouping</td>
<td>Order.group('customer', { count: { $sum: 1 }, total: { $sum: '$price' } })</td>
<td>SELECT customer, COUNT(*) AS count, SUM(price) AS total<br>FROM orders<br>GROUP BY customer</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:'$customer',count:{$sum:1},total:{$sum:'$price'}}}<br>])</td>
</tr>

<tr>
<td>Sort by group column</td>
<td>Order.group('customer', { total: { $sum: '$price' } })<br>.order('customer')</td>
<td>SELECT customer, SUM(price) AS total<br>FROM orders<br>GROUP BY customer<br>ORDER BY customer</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:'$customer',total:{$sum:'$price'}}},<br>&nbsp;&nbsp;{$sort:{\_id:1}}<br>])</td>
</tr>

<tr>
<td>Sort by aggregated column</td>
<td>Order.group('customer', { total: { $sum: '$price' } })<br>.order('total')</td>
<td>SELECT customer, SUM(price) AS total<br>FROM orders<br>GROUP BY customer<br>ORDER BY total</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:'$customer',total:{$sum:'$price'}}},<br>&nbsp;&nbsp;{$sort:{total:1}}<br>])</td>
</tr>

<tr>
<td>Condition on aggregated column</td>
<td>Order.group('customer', { count: { $sum: 1 } })<br>.where({ count: { $gte: 3 } })</td>
<td>SELECT customer, COUNT(*) AS count<br>FROM orders<br>GROUP BY customer<br>HAVING count&gt;=3</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:'$customer',count:{$sum:1}}},<br>&nbsp;&nbsp;{$match:{count:{$gte:3}}}<br>])</td>
</tr>

<tr>
<td>Grouping by multiple columns</td>
<td>Order.group('customer date', { count: { $sum: 1 } })</td>
<td>SELECT customer, date, COUNT(*) AS count<br>FROM orders<br>GROUP BY customer, date</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:{customer:'$customer', date:'$date'},count:{$sum:1}}}<br>])</td>
</tr>

<tr>
<td>Min/Max functions</td>
<td>Order.group('customer', { min_price: { $min: '$price' }, max_price: { $max: '$price' } })</td>
<td>SELECT customer, MIN(price) AS min_price, MAX(price) AS max_price<br>FROM orders<br>GROUP BY customer</td>
<td>db.orders.aggregate([<br>&nbsp;&nbsp;{$group:{_id:'$customer',min_price:{$min:'$price'},max_price:{$max:'$price'}}}<br>])</td>
</tr>

</tbody></table>
