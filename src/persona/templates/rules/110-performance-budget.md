---
id: arela.performance_budget
title: Performance Budget
category: performance
severity: should
version: 1.0.0
---

# Performance Budget

## Principle

**Fast is a feature.** Set performance budgets and enforce them. Every millisecond matters.

## Performance Budgets

### Web Application

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Time to First Byte (TTFB) | < 200ms | Server response |
| First Contentful Paint (FCP) | < 1.8s | User sees content |
| Largest Contentful Paint (LCP) | < 2.5s | Main content loaded |
| Time to Interactive (TTI) | < 3.8s | Page is interactive |
| Cumulative Layout Shift (CLS) | < 0.1 | Visual stability |
| First Input Delay (FID) | < 100ms | Interaction responsiveness |
| Total Bundle Size | < 200KB | Gzipped JS |

### API Endpoints

| Metric | Budget | Measurement |
|--------|--------|-------------|
| P50 Latency | < 100ms | Median response |
| P95 Latency | < 500ms | 95th percentile |
| P99 Latency | < 1000ms | 99th percentile |
| Error Rate | < 0.1% | Failed requests |
| Throughput | > 1000 req/s | Requests per second |

### Database Queries

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Simple Query | < 10ms | Single table |
| Complex Query | < 100ms | Joins, aggregations |
| Full-text Search | < 200ms | Search queries |
| N+1 Queries | 0 | No N+1 patterns |

## Enforcement

### CI/CD Pipeline

```yaml
# .github/workflows/performance.yml
- name: Lighthouse CI
  run: lhci autorun
  fail-if: LCP > 2.5s

- name: Bundle Size
  run: bundlesize
  fail-if: size > 200KB

- name: API Load Test
  run: k6 run load-test.js
  fail-if: p95 > 500ms
```

### Pre-commit Hooks

```bash
# Check bundle size before commit
npm run build
bundlesize check
```

### Performance Reviews

Every PR must answer:
- [ ] Does this add to bundle size? By how much?
- [ ] Does this add database queries? Are they optimized?
- [ ] Does this add API calls? Are they cached?
- [ ] Does this block rendering? Can it be deferred?
- [ ] Have you tested on slow 3G?

## Optimization Strategies

### 1. Code Splitting

```typescript
// Bad: Load everything upfront
import { HugeComponent } from './huge';

// Good: Lazy load
const HugeComponent = lazy(() => import('./huge'));
```

### 2. Image Optimization

```html
<!-- Bad: Unoptimized image -->
<img src="photo.jpg" />

<!-- Good: Responsive, optimized -->
<img
  src="photo-800.webp"
  srcset="photo-400.webp 400w, photo-800.webp 800w"
  sizes="(max-width: 600px) 400px, 800px"
  loading="lazy"
  alt="Description"
/>
```

### 3. Database Optimization

```sql
-- Bad: N+1 query
SELECT * FROM users;
-- Then for each user:
SELECT * FROM posts WHERE user_id = ?;

-- Good: Single query with join
SELECT users.*, posts.*
FROM users
LEFT JOIN posts ON posts.user_id = users.id;
```

### 4. Caching Strategy

```
Browser Cache (1 hour)
  ↓
CDN Cache (1 day)
  ↓
Redis Cache (1 hour)
  ↓
Database
```

### 5. API Optimization

```typescript
// Bad: Multiple round trips
const user = await api.getUser(id);
const posts = await api.getUserPosts(id);
const comments = await api.getUserComments(id);

// Good: Single request
const { user, posts, comments } = await api.getUserData(id);
```

## Monitoring

### Real User Monitoring (RUM)

Track actual user experience:
- Page load times
- API latency
- Error rates
- Geographic distribution

**Tools:** Datadog, New Relic, Sentry

### Synthetic Monitoring

Automated tests from multiple locations:
- Uptime checks
- Performance tests
- API health checks

**Tools:** Pingdom, UptimeRobot, Checkly

### Performance Dashboard

Display real-time:
- Core Web Vitals
- API P95 latency
- Error rates
- Throughput

## Performance Regression

### When Budget is Exceeded

1. **Alert** - Slack notification
2. **Block** - PR cannot merge
3. **Investigate** - What changed?
4. **Fix** - Optimize or increase budget
5. **Document** - Why budget changed

### Budget Adjustment

Only increase budget if:
- Business requirement (e.g., new feature)
- Technical limitation (e.g., third-party)
- User impact is minimal
- Optimization is not feasible

**Require:** CTO approval + ADR document

## Performance Culture

### Performance Reviews

Monthly review:
- Are we meeting budgets?
- Where are we slow?
- What can we optimize?
- What's the ROI?

### Performance Champions

- Designate per team
- Share optimization wins
- Review performance PRs
- Run performance workshops

## Common Issues

### 🐌 Slow Page Load

**Causes:**
- Large bundle size
- Unoptimized images
- Blocking scripts
- No caching

**Fixes:**
- Code splitting
- Image optimization
- Async/defer scripts
- Aggressive caching

### 🐌 Slow API

**Causes:**
- N+1 queries
- Missing indexes
- No caching
- Synchronous operations

**Fixes:**
- Optimize queries
- Add indexes
- Implement caching
- Use async/background jobs

### 🐌 Slow Database

**Causes:**
- Missing indexes
- Large table scans
- Complex joins
- No query optimization

**Fixes:**
- Add indexes
- Partition tables
- Optimize queries
- Use read replicas

## Performance Testing

### Load Testing

```javascript
// k6 load test
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% < 500ms
  },
};

export default function() {
  let res = http.get('https://api.example.com/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Stress Testing

Find breaking point:
- Gradually increase load
- Identify bottlenecks
- Plan capacity

### Spike Testing

Sudden traffic surge:
- Black Friday
- Product launch
- Viral content

## Metrics

Track weekly:

- **Core Web Vitals:** LCP, FID, CLS
- **API Latency:** P50, P95, P99
- **Error Rate:** % failed requests
- **Throughput:** Requests per second
- **Bundle Size:** KB gzipped

**Healthy targets:**
- LCP: < 2.5s (75% of loads)
- FID: < 100ms (75% of interactions)
- CLS: < 0.1 (75% of loads)
- P95 API: < 500ms
- Error Rate: < 0.1%

## Summary

- Set clear performance budgets
- Enforce in CI/CD
- Monitor real users
- Optimize continuously
- Never regress

**Fast is not a nice-to-have. It's a must-have.**
