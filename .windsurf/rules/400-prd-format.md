---
trigger: always_on
---

# PRD Format

## Principle

**A good PRD answers: What are we building, why, and how do we know it worked?**

## The Template

```markdown
# [Feature Name]

## Problem Statement
What problem are we solving? Who has this problem?

## Goals
What are we trying to achieve? (Measurable)

## Non-Goals
What are we explicitly NOT doing?

## User Stories
As a [user type], I want to [action], so that [benefit].

## Success Metrics
How do we measure success?

## Requirements
### Must Have
- Critical features

### Should Have
- Important but not critical

### Nice to Have
- Future enhancements

## User Flow
Step-by-step user journey

## Technical Considerations
- API changes
- Database schema
- Performance concerns
- Security implications

## Open Questions
What do we still need to figure out?

## Timeline
When do we ship?
```

## Example: User Authentication

```markdown
# User Authentication System

## Problem Statement
Users can't create accounts or log in to save their preferences.
Without authentication, we can't personalize the experience or
track user behavior.

**Who:** All users who want to save data

## Goals
1. Enable user registration and login
2. Support email/password and Google OAuth
3. Achieve 80% registration completion rate
4. <2s login time (p95)

## Non-Goals
- Social login beyond Google (Twitter, Facebook)
- Two-factor authentication (v2)
- Password reset via SMS (email only)
- Enterprise SSO (future)

## User Stories

### Registration
**As a** new user  
**I want to** create an account with email/password  
**So that** I can save my preferences

**Acceptance Criteria:**
- Email validation (format + uniqueness)
- Password requirements (8+ chars, 1 number, 1 special)
- Email verification required
- Clear error messages

### Login
**As a** returning user  
**I want to** log in with my credentials  
**So that** I can access my saved data

**Acceptance Criteria:**
- Email + password login
- "Remember me" checkbox
- "Forgot password" link
- Max 5 failed attempts → temporary lockout

### OAuth
**As a** user  
**I want to** sign in with Google  
**So that** I don't need another password

**Acceptance Criteria:**
- Google OAuth 2.0
- Auto-create account on first login
- Link existing account if email matches

## Success Metrics

### Primary
- **Registration completion rate:** 80%
  - Baseline: N/A (new feature)
  - Measure: % who complete registration after starting

- **Login success rate:** 95%
  - Measure: % of login attempts that succeed

### Secondary
- **Time to register:** <60s (p95)
- **Time to login:** <2s (p95)
- **OAuth adoption:** 40% of new users

### Guardrail
- **Failed login rate:** <5%
  - If higher, investigate UX issues

## Requirements

### Must Have
- Email/password registration
- Email verification
- Login with email/password
- Google OAuth
- Password reset via email
- Session management (7-day expiry)
- Logout

### Should Have
- "Remember me" (30-day session)
- Account lockout after 5 failed attempts
- Password strength indicator
- Loading states for all actions

### Nice to Have
- Magic link login (passwordless)
- Profile picture upload
- Account deletion
- Export user data

## User Flow

### Registration Flow
1. User clicks "Sign Up"
2. Form: Email, Password, Confirm Password
3. Client-side validation
4. Submit → API call
5. Success → Email sent
6. User clicks verification link
7. Redirect to dashboard

### Login Flow
1. User clicks "Log In"
2. Form: Email, Password, Remember Me
3. Submit → API call
4. Success → Redirect to dashboard
5. Failure → Show error, allow retry

### OAuth Flow
1. User clicks "Continue with Google"
2. Redirect to Google consent
3. User approves
4. Redirect back with token
5. API creates/links account
6. Redirect to dashboard

## Technical Considerations

### API Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/verify-email
POST /api/auth/reset-password
POST /api/auth/oauth/google
GET  /api/auth/me
```

### Database Schema
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR, -- NULL for OAuth-only
  email_verified BOOLEAN DEFAULT FALSE,
  oauth_provider VARCHAR,
  oauth_id VARCHAR,
  created_at TIMESTAMP,
  last_login TIMESTAMP
)

sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  token VARCHAR UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
)
```

### Security
- Passwords hashed with bcrypt (cost factor 12)
- Session tokens: 32-byte random, stored hashed
- HTTPS only (no HTTP)
- CSRF protection
- Rate limiting: 5 req/min per IP for auth endpoints
- SQL injection prevention (parameterized queries)

### Performance
- Login: <2s (p95)
- Registration: <3s (p95)
- Cache user sessions (Redis)
- Database indexes on email, session token

## Open Questions
1. Should we support multiple OAuth providers in v1?
   - **Decision:** Google only, add others in v2
2. Password requirements too strict?
   - **Decision:** Test with 5 users, adjust if >50% complain
3. Email verification required or optional?
   - **Decision:** Required (prevent spam)

## Timeline
- **Design:** Week 1
- **Backend API:** Week 2-3
- **Frontend:** Week 3-4
- **Testing:** Week 4
- **Launch:** Week 5

## Dependencies
- Email service (SendGrid)
- Google OAuth credentials
- Redis for session storage

## Risks
- **Email deliverability:** Verification emails in spam
  - Mitigation: Use reputable provider (SendGrid), SPF/DKIM
- **OAuth downtime:** Google OAuth unavailable
  - Mitigation: Fallback to email/password
- **Security breach:** Leaked passwords
  - Mitigation: Bcrypt, rate limiting, monitoring
```

## The Checklist

Before shipping a PRD, ensure it has:

- [ ] Clear problem statement
- [ ] Measurable goals
- [ ] Explicit non-goals
- [ ] User stories with acceptance criteria
- [ ] Success metrics (primary + secondary)
- [ ] Requirements (must/should/nice)
- [ ] User flow diagram
- [ ] Technical considerations
- [ ] Open questions (with decisions)
- [ ] Timeline
- [ ] Dependencies
- [ ] Risks + mitigations

## Common Mistakes

### **1. Solution, Not Problem**
```markdown
# ❌ Build a dashboard
# ✅ Users can't see their usage metrics
```

### **2. Vague Goals**
```markdown
# ❌ Improve user experience
# ✅ Increase registration completion rate from 60% to 80%
```

### **3. No Success Metrics**
```markdown
# ❌ We'll know it's successful when users like it
# ✅ 80% registration completion, 95% login success rate
```

### **4. Everything is Must Have**
```markdown
# ❌ Must Have: 47 features
# ✅ Must Have: 5 core features, Should Have: 8, Nice to Have: 12
```

## Remember

**A PRD is not a spec—it's a shared understanding.**

Engineers, designers, and product should all be able to read it and know what success looks like.

---

*"If you can't measure it, you can't improve it."*  
*- Peter Drucker*