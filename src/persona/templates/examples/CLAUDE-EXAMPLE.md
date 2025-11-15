# Claude Agent Example: Using Arela Memory

**Ticket:** "Refactor authentication system to support OAuth"

---

## ❌ **Bad Approach (Old Way)**

```bash
# Claude reads everything to understand the system
find src/auth -name "*.ts" | xargs cat  # 20 files, 40k tokens
grep -r "authentication" src/           # Another 30k tokens
cat docs/architecture.md                # 5k tokens

# Total: 75k tokens just to understand the system
```

**Result:**
- Massive token usage
- Still missing context (why was it built this way?)
- Suggests changes that conflict with past decisions
- Breaks existing patterns

---

## ✅ **Good Approach (Arela Way)**

### **Step 1: Understand current architecture**

```bash
arela_search "authentication implementation"
```

**Output:**
```
📍 src/auth/jwt.ts:1-89
  // Current JWT-based auth system
  export function generateToken(userId: string) { ... }
  export function verifyToken(token: string) { ... }

📍 src/middleware/auth.ts:12-45
  // Auth middleware
  export async function authenticate(req, res, next) { ... }

📍 src/api/auth.ts:23-67
  // Login/register endpoints
  router.post('/auth/login', ...) { ... }
```

**Learned:**
- Current system uses JWT
- Auth middleware in `src/middleware/auth.ts`
- Login endpoints in `src/api/auth.ts`
- Token generation in `src/auth/jwt.ts`

**Tokens used:** 1,500 (vs 40,000)

---

### **Step 2: Check why it was built this way**

```bash
arela memory governance --search "authentication"
```

**Output:**
```json
{
  "decision": "Use JWT over sessions",
  "date": "2024-09-15",
  "rationale": "Stateless auth for horizontal scaling. Sessions would require Redis.",
  "alternatives_considered": [
    "Sessions + Redis (rejected: added complexity)",
    "OAuth only (rejected: wanted email/password option)"
  ],
  "future_plans": "Add OAuth as ADDITIONAL option, keep JWT for email/password"
}
```

**Learned:**
- They WANT to keep JWT (don't remove it!)
- OAuth should be ADDITIONAL, not replacement
- They rejected sessions for scaling reasons
- This aligns with the ticket (add OAuth, don't replace)

**Tokens used:** 500

---

### **Step 3: Check project patterns**

```bash
arela memory project --category pattern
```

**Output:**
```json
{
  "auth_pattern": "Passport.js for OAuth strategies",
  "env_vars": "Store OAuth secrets in .env, validate with Zod",
  "database": "Prisma with User model, add oauth_provider field",
  "error_handling": "Use ApiError class with specific codes"
}
```

**Learned:**
- Use Passport.js (they already have it)
- OAuth secrets in .env
- Extend User model with oauth_provider
- Use their ApiError pattern

**Tokens used:** 300

---

### **Step 4: Check user preferences**

```bash
arela memory user --patterns
```

**Output:**
```json
{
  "architecture_style": "Keep auth logic in src/auth/, middleware separate",
  "testing": "Mock external OAuth providers, test with fixtures",
  "documentation": "Update README with OAuth setup instructions",
  "migration": "Prefer backward-compatible changes"
}
```

**Learned:**
- Keep new OAuth code in `src/auth/oauth.ts`
- Mock OAuth in tests (don't hit real APIs)
- Document setup process
- Must be backward-compatible (existing JWT users unaffected)

**Tokens used:** 400

---

### **Step 5: Check dependencies**

```bash
arela graph --from src/auth/jwt.ts
arela graph --from src/middleware/auth.ts
```

**Output:**
```
src/auth/jwt.ts is imported by:
  - src/middleware/auth.ts
  - src/api/auth.ts
  - src/api/users.ts (for token refresh)

src/middleware/auth.ts is used in:
  - src/api/users.ts
  - src/api/profile.ts
  - src/api/posts.ts
  - 12 other protected routes
```

**Learned:**
- Auth middleware is used everywhere (must stay compatible)
- JWT is used in 3 places (all must work with OAuth too)
- 15+ routes depend on auth middleware (can't break it)

**Tokens used:** 600

---

### **Step 6: Design the solution**

**Total context gathered:** 3,300 tokens (vs 75,000)

**Now I know:**
1. Keep JWT system (don't remove)
2. Add OAuth as additional option
3. Use Passport.js (already in project)
4. Extend User model with oauth_provider
5. Keep auth middleware compatible
6. Mock OAuth in tests
7. Document setup
8. Must be backward-compatible

**Design:**

```typescript
// src/auth/oauth.ts (NEW)
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../db/prisma';
import { generateToken } from './jwt';

// Configure strategies
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { oauthId: profile.id, oauthProvider: 'google' }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.emails[0].value,
        name: profile.displayName,
        oauthId: profile.id,
        oauthProvider: 'google',
      }
    });
  }
  
  done(null, user);
}));

// Similar for GitHub...

export { passport };
```

```typescript
// src/api/auth.ts (EXTEND)
import { passport } from '../auth/oauth';

// Keep existing JWT routes
router.post('/auth/login', ...);      // Unchanged
router.post('/auth/register', ...);   // Unchanged

// Add OAuth routes
router.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    // Generate JWT for OAuth user (reuse existing system!)
    const token = generateToken(req.user.id);
    res.redirect(`/auth/success?token=${token}`);
  }
);

// Similar for GitHub...
```

```typescript
// src/middleware/auth.ts (NO CHANGES NEEDED!)
// Already works because OAuth users get JWT tokens too
export async function authenticate(req, res, next) {
  // Existing code unchanged
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = verifyToken(token);
  req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  next();
}
```

```prisma
// prisma/schema.prisma (EXTEND)
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String?  // Nullable now (OAuth users don't have password)
  name          String
  oauthProvider String?  // 'google', 'github', null for email/password
  oauthId       String?  // OAuth provider's user ID
  createdAt     DateTime @default(now())
  
  @@unique([oauthProvider, oauthId])
}
```

```typescript
// __tests__/auth/oauth.test.ts (NEW)
import request from 'supertest';
import { app } from '../../src/app';

// Mock Passport strategies
jest.mock('passport-google-oauth20');
jest.mock('passport-github2');

describe('OAuth Authentication', () => {
  it('should redirect to Google OAuth', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google.com');
  });
  
  it('should create user on OAuth callback', async () => {
    // Mock OAuth response
    const mockProfile = {
      id: 'google-123',
      emails: [{ value: 'test@example.com' }],
      displayName: 'Test User',
    };
    
    // Test callback handler
    // ... (using fixtures, not real OAuth)
  });
  
  it('should generate JWT for OAuth user', async () => {
    // Verify OAuth users get JWT tokens
    // ... (backward compatibility test)
  });
});
```

```markdown
# README.md (UPDATE)

## Authentication

### Email/Password (Existing)
POST /auth/register
POST /auth/login

### OAuth (New)
GET /auth/google - Initiate Google OAuth
GET /auth/github - Initiate GitHub OAuth

### Setup
1. Create OAuth apps:
   - Google: https://console.cloud.google.com
   - GitHub: https://github.com/settings/developers

2. Add to .env:
   GOOGLE_CLIENT_ID=your_id
   GOOGLE_CLIENT_SECRET=your_secret
   GITHUB_CLIENT_ID=your_id
   GITHUB_CLIENT_SECRET=your_secret

3. Run migration:
   npx prisma migrate dev
```

---

## 🎯 **Result**

**Tokens used:** 3,300 (vs 75,000) - **23x savings!**  
**Time:** 15 minutes (vs 2 hours)  
**Quality:** Perfect architectural fit

**The solution:**
- ✅ Keeps JWT (as requested in governance)
- ✅ Adds OAuth as additional option (not replacement)
- ✅ Uses Passport.js (project pattern)
- ✅ Backward-compatible (existing auth unchanged)
- ✅ Extends User model properly
- ✅ Reuses existing JWT system for OAuth users
- ✅ Mocks OAuth in tests (user preference)
- ✅ Documents setup (user preference)
- ✅ No breaking changes (15+ routes still work)

**Perfect architecture. First try. Because you used the memory system.** 🔥

---

## 💡 **Key Insight**

**Without memory system:**
- Read 75k tokens
- Miss the "why" (governance)
- Suggest removing JWT (wrong!)
- Break existing routes
- 3 revision rounds

**With memory system:**
- Read 3.3k tokens (23x less)
- Understand the "why" (governance)
- Keep JWT, add OAuth (correct!)
- Maintain compatibility
- Perfect first try ✅

**The memory system made you a better architect.** 🧠
