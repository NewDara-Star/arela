# Ticket: DEEPSEEK-001 - Optimize Database Queries

**Agent:** @deepseek  
**Priority:** medium  
**Complexity:** medium  
**Estimated tokens:** 3000  
**Cost estimate:** $0.003  
**Dependencies:** None  
**Estimated time:** 20-30 minutes  

## Context

Our API endpoints are slow due to inefficient database queries. We need to optimize the most frequently used queries to improve response times.

Current performance:
- `/api/users` - 2.5s average
- `/api/posts` - 1.8s average
- `/api/comments` - 3.2s average

Target performance:
- All endpoints < 500ms

## Requirements

- [ ] Analyze existing queries
- [ ] Identify N+1 query problems
- [ ] Add appropriate indexes
- [ ] Implement query batching where needed
- [ ] Add query result caching
- [ ] Optimize JOIN operations

## Acceptance Criteria

- [ ] All target endpoints respond in < 500ms
- [ ] No N+1 query problems
- [ ] Database indexes added and documented
- [ ] Query performance tests added
- [ ] Caching strategy implemented
- [ ] Performance metrics logged

## Technical Specification

**Files to Optimize:**
- `src/api/users.ts`
- `src/api/posts.ts`
- `src/api/comments.ts`

**Optimization Techniques:**
1. **Add Indexes:**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_posts_user_id ON posts(user_id);
   CREATE INDEX idx_comments_post_id ON comments(post_id);
   ```

2. **Use Query Batching:**
   ```typescript
   // Before: N+1 queries
   const users = await db.users.findMany();
   for (const user of users) {
     user.posts = await db.posts.findMany({ where: { userId: user.id } });
   }

   // After: 2 queries
   const users = await db.users.findMany();
   const posts = await db.posts.findMany({
     where: { userId: { in: users.map(u => u.id) } }
   });
   ```

3. **Implement Caching:**
   ```typescript
   const cached = await redis.get(`users:${id}`);
   if (cached) return JSON.parse(cached);
   
   const user = await db.users.findUnique({ where: { id } });
   await redis.set(`users:${id}`, JSON.stringify(user), 'EX', 3600);
   ```

## Test Requirements

- [ ] Performance benchmarks before/after
- [ ] Load testing with 1000 concurrent requests
- [ ] Query count verification
- [ ] Cache hit rate monitoring

## Definition of Done

- [ ] All endpoints meet performance targets
- [ ] Indexes created and documented
- [ ] Caching implemented
- [ ] Performance tests passing
- [ ] Monitoring dashboards updated
- [ ] Documentation updated

## Performance Metrics

**Before:**
```
GET /api/users
- Avg: 2.5s
- P95: 4.2s
- Queries: 47

GET /api/posts
- Avg: 1.8s
- P95: 3.1s
- Queries: 23
```

**Target:**
```
GET /api/users
- Avg: < 500ms
- P95: < 800ms
- Queries: < 5

GET /api/posts
- Avg: < 500ms
- P95: < 800ms
- Queries: < 5
```

---

**Estimated Cost:** $0.003 (3K tokens × $0.001)  
**Agent:** DeepSeek (cheapest, good for optimization and refactoring)  
**Why DeepSeek:** This is algorithmic optimization and refactoring work that DeepSeek handles well at the lowest cost.
