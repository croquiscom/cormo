---
id: comment
title: Query Comment
---

Query Comment allows you to add custom comments to your SQL queries for better tracking and debugging in production environments.
This is particularly useful when analyzing slow query logs or database monitoring tools.

## Basic Usage

You can add a comment to your query using the `comment()` method:

```typescript
const users = await User.query()
  .where({ age: { $gte: 30 } })
  .comment('Fetch active users over 30')
  .exec();
```

This will generate SQL like:

```sql
/* Fetch active users over 30 */ SELECT * FROM users WHERE age >= 30
```

## Supported Operations

The `comment()` method works with all DML operations:

### SELECT (Find)

```typescript
const users = await User.query().where({ status: 'active' }).comment('Get active users for dashboard').exec();
```

Result:

```sql
/* Get active users for dashboard */ SELECT * FROM users WHERE status = 'active'
```

You can also use `comment` with `Model.find()` directly:

```typescript
// Find by single ID
const user = await User.find(1).comment('Find user by ID for profile page');

// Find by multiple IDs
const users = await User.find([1, 2, 3]).comment('Batch fetch users');
```

Result:

```sql
/* Find user by ID for profile page */ SELECT * FROM users WHERE id = 1 LIMIT 1
```

### COUNT

```typescript
const count = await User.query()
  .where({ age: { $gte: 18 } })
  .comment('Count adult users')
  .count();
```

Result:

```sql
/* Count adult users */ SELECT COUNT(*) AS count FROM users WHERE age >= 18
```

### INSERT (Create)

```typescript
const user = await User.create({ name: 'John Doe', age: 28 }, { comment: 'User registration from signup form' });
```

Result:

```sql
/* User registration from signup form */ INSERT INTO users (name, age) VALUES ('John Doe', 28)
```

### INSERT BULK (CreateBulk)

```typescript
const users = await User.createBulk(
  [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
  ],
  { comment: 'Bulk user import from CSV' },
);
```

Result:

```sql
/* Bulk user import from CSV */ INSERT INTO users (name, age) VALUES ('Alice', 25), ('Bob', 30)
```

### Instance Save

You can use `comment` when saving existing model instances:

```typescript
// Update existing record
const user = await User.find(1);
user.age = 31;
user.name = 'John Updated';
await user.save({ comment: 'Update user profile from edit form' });

// Create new record
const newUser = new User({ name: 'Alice', age: 25, email: 'alice@example.com' });
await newUser.save({ comment: 'Create user from registration' });
```

Result:

```sql
/* Update user profile from edit form */ UPDATE users SET name = 'John Updated', age = 31 WHERE id = 1
/* Create user from registration */ INSERT INTO users (name, age, email) VALUES ('Alice', 25, 'alice@example.com')
```

### UPDATE

```typescript
const count = await User.query()
  .where({ status: 'pending' })
  .comment('Activate pending users - batch job')
  .update({ status: 'active' });
```

Result:

```sql
/* Activate pending users - batch job */ UPDATE users SET status = 'active' WHERE status = 'pending'
```

You can also use `comment` with `Model.update()` directly:

```typescript
const count = await User.update({ status: 'active' }, { age: { $gte: 30 } }, { comment: 'Activate users over 30' });
```

Result:

```sql
/* Activate users over 30 */ UPDATE users SET status = 'active' WHERE age >= 30
```

### DELETE

```typescript
const count = await User.query()
  .where({ deleted_at: { $not: null } })
  .comment('Cleanup soft-deleted users')
  .delete();
```

Result:

```sql
/* Cleanup soft-deleted users */ DELETE FROM users WHERE deleted_at IS NOT NULL
```

You can also use `comment` with `Model.delete()` directly:

```typescript
const count = await User.delete({ age: { $lt: 18 } }, { comment: 'Remove underage users' });
```

Result:

```sql
/* Remove underage users */ DELETE FROM users WHERE age < 18
```

### UPSERT

```typescript
await User.query()
  .where({ email: 'john@example.com' })
  .comment('Upsert user profile from API sync')
  .upsert({ name: 'John Doe', email: 'john@example.com' });
```

Result (MySQL):

```sql
/* Upsert user profile from API sync */ INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com')
ON DUPLICATE KEY UPDATE name = 'John Doe', email = 'john@example.com'
```

## Use Cases

### 1. Production Debugging

When analyzing slow query logs, query comments help identify which part of your application generated the query:

```typescript
// Without comment
const users = await User.where({ age: { $gt: 30 } }).exec();
// Query log: SELECT * FROM users WHERE age > 30

// With comment
const users = await User.where({ age: { $gt: 30 } })
  .comment('UserDashboard.getStatistics')
  .exec();
// Query log: /* UserDashboard.getStatistics */ SELECT * FROM users WHERE age > 30
```

### 2. Feature Tracking

Track which features are generating the most database queries:

```typescript
// Analytics feature
const stats = await User.query()
  .where({ created_at: { $gte: startDate } })
  .comment('Analytics - New user registration stats')
  .count();

// Report feature
const users = await User.query().where({ subscription: 'premium' }).comment('Report - Premium users export').exec();
```

### 3. A/B Testing

Differentiate queries from different experiment variants:

```typescript
if (experimentVariant === 'A') {
  users = await User.query()
    .where({ age: { $gte: 25 } })
    .comment('Experiment A - Age filter 25+')
    .exec();
} else {
  users = await User.query()
    .where({ age: { $gte: 30 } })
    .comment('Experiment B - Age filter 30+')
    .exec();
}
```

## SQL Injection Protection

Query alias automatically sanitizes input to prevent SQL injection attacks:

```typescript
const maliciousInput = "'; DROP TABLE users; --";
const users = await User.query().where({ age: 30 }).comment(maliciousInput).exec();
```

Result (safe):

```sql
/*  DROP TABLE users -- */ SELECT * FROM users WHERE age = 30
```

The sanitization:

- Removes quotes (`'`, `"`)
- Removes semicolons (`;`)
- Removes SQL comment markers (`/*`, `*/`)
- Limits length to 100 characters
- Preserves alphanumeric, spaces, underscores, hyphens, and Unicode characters

## Best Practices

### 1. Use Descriptive Names

```typescript
// ❌ Bad
.comment('query1')

// ✅ Good
.comment('UserService.fetchActiveSubscribers')
```

### 2. Include Context

```typescript
// ✅ Include module/feature name
.comment('Dashboard - Load user statistics')

// ✅ Include operation purpose
.comment('Cleanup job - Remove expired sessions')

// ✅ Include business context
.comment('Payment - Fetch pending invoices for reminder email')
```

### 3. Use Consistent Naming Convention

```typescript
// Choose a pattern and stick to it
.comment('Module.Method - Description')
.comment('[Feature] Action - Context')
.comment('Service::operation - details')
```

### 4. Avoid Sensitive Information

```typescript
// ❌ Don't include sensitive data
.comment(`User ID: ${userId}`)

// ✅ Include only general context
.comment('User profile fetch')
```

## Database Support

Query alias is supported on:

- ✅ MySQL / MariaDB
- ✅ PostgreSQL
- ✅ SQLite3
- ❌ MongoDB (not applicable - MongoDB doesn't support SQL comments)
- ❌ Redis (not applicable - Redis doesn't support SQL)

## Performance Impact

Query alias has minimal performance impact:

- Adds only a small comment prefix to the SQL query
- No additional database round trips
- Comment is typically ignored by query optimizer
- String sanitization is lightweight (regex-based)

The comment does slightly increase:

- Network bandwidth (typically 10-100 bytes per query)
- Query log storage if logging is enabled

These overheads are negligible for most applications.
