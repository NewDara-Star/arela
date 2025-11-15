# Agent Workflow: How to Use Arela's Memory System

**READ THIS BEFORE EVERY TICKET!**

---

## 🧠 **Your Superpowers (Arela Memory System)**

You have access to a **6-layer memory system** that knows:
- What code exists (Vector + Graph)
- How this project works (Project Memory)
- How the user works (User Memory)
- What was decided and why (Governance)
- What's happening right now (Session)

**Use this BEFORE reading files manually!**

---

## 📋 **Step-by-Step Workflow**

### **Step 1: Understand the Task (5 seconds)**

Read the ticket. Ask yourself:
- What am I building/fixing?
- What files might be involved?
- Has this been done before?

---

### **Step 2: Query Semantic Search (30 seconds)**

**Always start here!**

```bash
# Find relevant code by meaning, not filename
arela_search "authentication flow"
arela_search "password reset logic"
arela_search "JWT token generation"
```

**This returns:**
- Top 10 most relevant code chunks
- File paths + line numbers
- ~1k tokens (vs 85k+ for grep)

**Example output:**
```
📍 src/auth/login.ts:45-67
  function handleLogin(email, password) {
    // JWT generation logic
  }

📍 src/auth/reset.ts:12-34
  function resetPassword(token) {
    // Password reset flow
  }
```

---

### **Step 3: Check Project Memory (10 seconds)**

**Learn how THIS project does things:**

```bash
# Get project conventions
arela memory project --category pattern
arela memory project --key auth_strategy
arela memory project --key testing_approach

# Get past decisions
arela memory project --category decision
```

**This tells you:**
- "We use Prisma for DB access"
- "Auth is handled by NextAuth.js"
- "Tests go in `__tests__` folders"
- "We prefer functional components"

**Why this matters:**
- Don't suggest Redux if they use Zustand
- Don't write class components if they use functional
- Follow THEIR patterns, not generic ones

---

### **Step 4: Check User Memory (10 seconds)**

**Learn how THIS USER works:**

```bash
# Get user preferences
arela memory user --patterns
arela memory user --key preferred_testing_library
arela memory user --key code_style
```

**This tells you:**
- "User prefers Vitest over Jest"
- "User writes tests BEFORE implementation (TDD)"
- "User likes small PRs (<300 lines)"
- "User avoids classes, prefers functions"

**Why this matters:**
- Suggest solutions that match their style
- Don't fight their preferences
- Build what THEY would build

---

### **Step 5: Check Graph Memory (20 seconds)**

**Understand relationships:**

```bash
# See what imports this file
arela graph --from src/auth/login.ts

# See what this file imports
arela graph --to src/auth/login.ts

# See the whole auth slice
arela graph --slice auth
```

**This tells you:**
- What files depend on your changes
- What files you can safely modify
- What the blast radius is

**Why this matters:**
- Don't break things downstream
- Know what to test
- Understand the architecture

---

### **Step 6: Check Governance (Optional, 10 seconds)**

**See past decisions:**

```bash
# Why was this chosen?
arela memory governance --search "authentication"
arela memory governance --recent 10
```

**This tells you:**
- "We chose JWT over sessions because..."
- "We tried OAuth but it was too complex"
- "We're planning to migrate to Supabase"

**Why this matters:**
- Don't suggest things they already rejected
- Understand the context
- Align with future plans

---

### **Step 7: NOW Read Files (If Needed)**

**Only after you've used the memory system!**

```bash
# Read specific files you found
cat src/auth/login.ts
cat src/auth/types.ts
```

**Why last?**
- Memory system already gave you 80% of context
- You know exactly which files to read
- You're not guessing or grepping blindly

---

## ❌ **Anti-Patterns (Don't Do This)**

### **Bad: Grep Everything**
```bash
# This costs 85k+ tokens and is slow
grep -r "authentication" .
find . -name "*.ts" | xargs cat
```

### **Bad: Read Random Files**
```bash
# Guessing without context
cat src/index.ts
cat src/app.ts
cat src/server.ts
# ... hoping to find something
```

### **Bad: Ignore Project Patterns**
```typescript
// User uses Prisma everywhere, you suggest TypeORM
// User uses functional components, you write classes
// User has a testing pattern, you ignore it
```

---

## ✅ **Good Example Workflow**

**Ticket:** "Add password reset feature"

**Agent thinks:**
```
1. Search: "password reset" → finds existing reset.ts (incomplete)
2. Project memory: "We use SendGrid for emails"
3. User memory: "User prefers async/await over promises"
4. Graph: reset.ts imports from auth.ts and email.ts
5. Governance: "We decided to use JWT tokens for reset links"

Now I know:
- There's already a reset.ts file (extend it, don't create new)
- Use SendGrid (not Nodemailer)
- Write async/await (not .then())
- Use JWT tokens (not random strings)
- Test auth.ts and email.ts integration
```

**Result:** Perfect solution that fits the project, first try. ✅

---

## 🎯 **Token Savings**

| Method | Tokens | Time | Accuracy |
|--------|--------|------|----------|
| grep + read everything | 85,000+ | 5 min | 60% |
| arela_search + memory | 2,000 | 30 sec | 95% |

**You save 40x tokens and get better results!**

---

## 🚀 **Quick Reference Card**

```bash
# 1. Find code
arela_search "what I'm looking for"

# 2. Learn project
arela memory project --category pattern
arela memory project --category decision

# 3. Learn user
arela memory user --patterns

# 4. See relationships
arela graph --from path/to/file.ts

# 5. See history
arela memory governance --search "topic"

# 6. Read files (only if needed)
cat specific/file.ts
```

---

## 💡 **Remember**

**The memory system is your brain. Use it!**

- 🧠 It knows the codebase better than grep
- 🎯 It knows the project patterns
- 👤 It knows the user's style
- 📚 It knows past decisions
- ⚡ It's 40x faster and cheaper

**Don't be a code monkey. Be a code surgeon.**

Use the memory system. Ship perfect solutions. First try. Every time. 🔥
