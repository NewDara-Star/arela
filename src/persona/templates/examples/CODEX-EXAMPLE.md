# Codex Agent Example: Using Arela Memory

**Ticket:** "Add user profile API endpoint"

---

## ❌ **Bad Approach (Old Way)**

```bash
# Codex guesses and reads everything
grep -r "user" src/
grep -r "profile" src/
grep -r "API" src/
cat src/api/*.ts  # 50 files, 85k tokens

# Then writes generic code that doesn't match project
```

**Result:** 
- 85k tokens wasted
- Code doesn't match project patterns
- Breaks existing conventions
- Needs 3 revision rounds

---

## ✅ **Good Approach (Arela Way)**

### **Step 1: Search for similar code**

```bash
arela_search "user API endpoints"
```

**Output:**
```
📍 src/api/users.ts:12-45
  router.get('/users/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });
    res.json(user);
  });

📍 src/api/auth.ts:67-89
  router.post('/auth/login', validateBody, async (req, res) => {
    // Similar pattern with validation
  });
```

**Learned:**
- They use Express router
- They use Prisma for DB
- They have a `validateBody` middleware
- They use async/await

---

### **Step 2: Check project patterns**

```bash
arela memory project --category pattern
```

**Output:**
```json
{
  "api_structure": "One router per resource in src/api/",
  "validation": "Use Zod schemas + validateBody middleware",
  "error_handling": "Use asyncHandler wrapper",
  "testing": "Tests in __tests__/api/ with supertest"
}
```

**Learned:**
- Put code in `src/api/profile.ts`
- Use Zod for validation
- Wrap in `asyncHandler`
- Write tests in `__tests__/api/profile.test.ts`

---

### **Step 3: Check user preferences**

```bash
arela memory user --key code_style
```

**Output:**
```json
{
  "imports": "Named imports, alphabetical",
  "error_responses": "Use ApiError class",
  "status_codes": "Use constants from http-status-codes",
  "comments": "Minimal, code should be self-documenting"
}
```

**Learned:**
- Import like: `import { Router, Request, Response } from 'express';`
- Errors like: `throw new ApiError(404, 'User not found');`
- Status like: `res.status(StatusCodes.OK).json(profile);`

---

### **Step 4: Check graph**

```bash
arela graph --from src/api/users.ts
```

**Output:**
```
src/api/users.ts imports:
  - src/middleware/auth.ts
  - src/middleware/validate.ts
  - src/db/prisma.ts
  - src/types/user.ts

src/api/users.ts is imported by:
  - src/api/index.ts (router registration)
```

**Learned:**
- Need to import those same middlewares
- Need to register in `src/api/index.ts`
- Use types from `src/types/user.ts`

---

### **Step 5: Write perfect code (first try)**

```typescript
// src/api/profile.ts
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { asyncHandler } from '../middleware/async-handler';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { prisma } from '../db/prisma';
import { ApiError } from '../errors/api-error';

const router = Router();

// Validation schema
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

// GET /api/profile - Get current user's profile
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, bio: true, avatar: true },
    });

    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Profile not found');
    }

    res.status(StatusCodes.OK).json(profile);
  })
);

// PATCH /api/profile - Update current user's profile
router.patch(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
      select: { id: true, name: true, email: true, bio: true, avatar: true },
    });

    res.status(StatusCodes.OK).json(updated);
  })
);

export default router;
```

```typescript
// src/api/index.ts (register the router)
import profileRouter from './profile';

app.use('/api', profileRouter);
```

```typescript
// __tests__/api/profile.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/prisma';

describe('Profile API', () => {
  it('should get user profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'New Name', bio: 'New bio' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});
```

---

## 🎯 **Result**

**Tokens used:** 2,000 (vs 85,000)  
**Time:** 2 minutes (vs 30 minutes)  
**Revisions needed:** 0 (vs 3)  
**Matches project:** 100% ✅

**The code:**
- Uses Express (correct)
- Uses Prisma (correct)
- Uses Zod validation (correct)
- Uses asyncHandler (correct)
- Uses ApiError (correct)
- Uses StatusCodes (correct)
- Follows import style (correct)
- Has tests (correct)
- Registered in index (correct)

**Perfect. First try. Because you used the memory system.** 🔥
