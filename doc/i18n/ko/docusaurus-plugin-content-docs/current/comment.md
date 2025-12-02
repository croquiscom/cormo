---
id: comment
title: Query Comment (쿼리 주석)
---

Query Comment는 SQL 쿼리에 사용자 정의 주석을 추가하여 프로덕션 환경에서 더 나은 추적 및 디버깅을 가능하게 합니다.
슬로우 쿼리 로그나 데이터베이스 모니터링 도구를 분석할 때 특히 유용합니다.

## 기본 사용법

`comment()` 메서드를 사용하여 쿼리에 주석을 추가할 수 있습니다:

```typescript
const users = await User.query()
  .where({ age: { $gte: 30 } })
  .comment('Fetch active users over 30')
  .exec();
```

다음과 같은 SQL이 생성됩니다:

```sql
/* Fetch active users over 30 */ SELECT * FROM users WHERE age >= 30
```

## 지원되는 작업

`comment()` 메서드는 모든 DML 작업에서 동작합니다:

### SELECT (조회)

```typescript
const users = await User.query().where({ status: 'active' }).comment('Get active users for dashboard').exec();
```

결과:

```sql
/* Get active users for dashboard */ SELECT * FROM users WHERE status = 'active'
```

`Model.find()`에서도 `comment`를 직접 사용할 수 있습니다:

```typescript
// 단일 ID로 조회
const user = await User.find(1).comment('Find user by ID for profile page');

// 여러 ID로 조회
const users = await User.find([1, 2, 3]).comment('Batch fetch users');
```

결과:

```sql
/* Find user by ID for profile page */ SELECT * FROM users WHERE id = 1 LIMIT 1
```

### COUNT (카운트)

```typescript
const count = await User.query()
  .where({ age: { $gte: 18 } })
  .comment('Count adult users')
  .count();
```

결과:

```sql
/* Count adult users */ SELECT COUNT(*) AS count FROM users WHERE age >= 18
```

### INSERT (생성)

```typescript
const user = await User.create({ name: 'John Doe', age: 28 }, { comment: 'User registration from signup form' });
```

결과:

```sql
/* User registration from signup form */ INSERT INTO users (name, age) VALUES ('John Doe', 28)
```

### INSERT BULK (대량 생성)

```typescript
const users = await User.createBulk(
  [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
  ],
  { comment: 'Bulk user import from CSV' },
);
```

결과:

```sql
/* Bulk user import from CSV */ INSERT INTO users (name, age) VALUES ('Alice', 25), ('Bob', 30)
```

### 인스턴스 저장 (Instance Save)

기존 모델 인스턴스를 저장할 때 `comment`를 사용할 수 있습니다:

```typescript
// 기존 레코드 수정
const user = await User.find(1);
user.age = 31;
user.name = 'John Updated';
await user.save({ comment: 'Update user profile from edit form' });

// 새 레코드 생성
const newUser = new User({ name: 'Alice', age: 25, email: 'alice@example.com' });
await newUser.save({ comment: 'Create user from registration' });
```

결과:

```sql
/* Update user profile from edit form */ UPDATE users SET name = 'John Updated', age = 31 WHERE id = 1
/* Create user from registration */ INSERT INTO users (name, age, email) VALUES ('Alice', 25, 'alice@example.com')
```

### UPDATE (수정)

```typescript
const count = await User.query()
  .where({ status: 'pending' })
  .comment('Activate pending users - batch job')
  .update({ status: 'active' });
```

결과:

```sql
/* Activate pending users - batch job */ UPDATE users SET status = 'active' WHERE status = 'pending'
```

`Model.update()`를 직접 사용할 때도 `comment`를 사용할 수 있습니다:

```typescript
const count = await User.update({ status: 'active' }, { age: { $gte: 30 } }, { comment: 'Activate users over 30' });
```

결과:

```sql
/* Activate users over 30 */ UPDATE users SET status = 'active' WHERE age >= 30
```

### DELETE (삭제)

```typescript
const count = await User.query()
  .where({ deleted_at: { $not: null } })
  .comment('Cleanup soft-deleted users')
  .delete();
```

결과:

```sql
/* Cleanup soft-deleted users */ DELETE FROM users WHERE deleted_at IS NOT NULL
```

`Model.delete()`를 직접 사용할 때도 `comment`를 사용할 수 있습니다:

```typescript
const count = await User.delete({ age: { $lt: 18 } }, { comment: 'Remove underage users' });
```

결과:

```sql
/* Remove underage users */ DELETE FROM users WHERE age < 18
```

### UPSERT (생성 또는 수정)

```typescript
await User.query()
  .where({ email: 'john@example.com' })
  .comment('Upsert user profile from API sync')
  .upsert({ name: 'John Doe', email: 'john@example.com' });
```

결과 (MySQL):

```sql
/* Upsert user profile from API sync */ INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com')
ON DUPLICATE KEY UPDATE name = 'John Doe', email = 'john@example.com'
```

## 사용 사례

### 1. 프로덕션 디버깅

슬로우 쿼리 로그를 분석할 때, 쿼리 별칭은 애플리케이션의 어느 부분에서 쿼리가 생성되었는지 식별하는 데 도움이 됩니다:

```typescript
// comment 없이
const users = await User.where({ age: { $gt: 30 } }).exec();
// 쿼리 로그: SELECT * FROM users WHERE age > 30

// comment 사용
const users = await User.where({ age: { $gt: 30 } })
  .comment('UserDashboard.getStatistics')
  .exec();
// 쿼리 로그: /* UserDashboard.getStatistics */ SELECT * FROM users WHERE age > 30
```

### 2. 기능 추적

가장 많은 데이터베이스 쿼리를 생성하는 기능을 추적합니다:

```typescript
// 분석 기능
const stats = await User.query()
  .where({ created_at: { $gte: startDate } })
  .comment('Analytics - New user registration stats')
  .count();

// 리포트 기능
const users = await User.query().where({ subscription: 'premium' }).comment('Report - Premium users export').exec();
```

### 3. A/B 테스트

다른 실험 변형의 쿼리를 구별합니다:

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

### 4. 한글 지원

Query alias는 한글 및 기타 유니코드 문자를 완벽하게 지원합니다:

```typescript
const users = await User.query()
  .where({ age: { $gte: 30 } })
  .comment('사용자 조회 - 30세 이상 활성회원')
  .exec();
```

결과:

```sql
/* 사용자 조회 - 30세 이상 활성회원 */ SELECT * FROM users WHERE age >= 30
```

## SQL 인젝션 방어

Query alias는 SQL 인젝션 공격을 방지하기 위해 자동으로 입력을 정제합니다:

```typescript
const maliciousInput = "'; DROP TABLE users; --";
const users = await User.query().where({ age: 30 }).comment(maliciousInput).exec();
```

결과 (안전):

```sql
/*  DROP TABLE users -- */ SELECT * FROM users WHERE age = 30
```

정제 과정:

- 따옴표 제거 (`'`, `"`)
- 세미콜론 제거 (`;`)
- SQL 주석 마커 제거 (`/*`, `*/`)
- 길이를 100자로 제한
- 영숫자, 공백, 밑줄, 하이픈, 유니코드 문자는 유지

## 모범 사례

### 1. 설명적인 이름 사용

```typescript
// ❌ 나쁜 예
.comment('query1')

// ✅ 좋은 예
.comment('UserService.fetchActiveSubscribers')
```

### 2. 컨텍스트 포함

```typescript
// ✅ 모듈/기능 이름 포함
.comment('Dashboard - Load user statistics')

// ✅ 작업 목적 포함
.comment('Cleanup job - Remove expired sessions')

// ✅ 비즈니스 컨텍스트 포함
.comment('Payment - Fetch pending invoices for reminder email')
```

### 3. 일관된 명명 규칙 사용

```typescript
// 패턴을 선택하고 일관되게 사용
.comment('Module.Method - Description')
.comment('[Feature] Action - Context')
.comment('Service::operation - details')
```

### 4. 민감한 정보 포함 금지

```typescript
// ❌ 민감한 데이터 포함하지 않기
.comment(`User ID: ${userId}`)

// ✅ 일반적인 컨텍스트만 포함
.comment('User profile fetch')
```

## 데이터베이스 지원

Query alias는 다음을 지원합니다:

- ✅ MySQL / MariaDB
- ✅ PostgreSQL
- ✅ SQLite3
- ❌ MongoDB (해당 없음 - MongoDB는 SQL 주석을 지원하지 않음)
- ❌ Redis (해당 없음 - Redis는 SQL을 지원하지 않음)

## 성능 영향

Query alias는 최소한의 성능 영향을 미칩니다:

- SQL 쿼리에 작은 주석 접두사만 추가
- 추가 데이터베이스 라운드트립 없음
- 주석은 일반적으로 쿼리 옵티마이저에 의해 무시됨
- 문자열 정제는 가볍습니다 (정규식 기반)

주석은 다음을 약간 증가시킵니다:

- 네트워크 대역폭 (일반적으로 쿼리당 10-100바이트)
- 로깅이 활성화된 경우 쿼리 로그 저장소

이러한 오버헤드는 대부분의 애플리케이션에서 무시할 수 있습니다.
