# CODEX-005: Update Documentation for v3.2.0

**Agent:** codex  
**Priority:** medium  
**Complexity:** simple  
**Status:** pending  
**Depends on:** CODEX-003

## Context
Update README, QUICKSTART, and CHANGELOG for v3.2.0 visual testing features.

## Technical Task
Update documentation files:
- README.md - Add v3.2.0 features
- QUICKSTART.md - Add "arela run web" guide
- CHANGELOG.md - Document v3.2.0 changes

## Acceptance Criteria
- [ ] README updated with visual testing features
- [ ] QUICKSTART has step-by-step guide for "arela run web"
- [ ] CHANGELOG documents all v3.2.0 changes
- [ ] Examples are clear and accurate
- [ ] Screenshots/GIFs if applicable

## Files to Modify
- `README.md`
- `QUICKSTART.md`
- `CHANGELOG.md`

## README.md Updates
Add to "What's New" section:
```markdown
## ✨ What's New in v3.2.0

### 🎭 Visual Testing with Playwright
- **Test Like a User** - Arela can now actually use your web apps
- **Catch UX Issues** - Find problems that code review misses
- **Automated Flows** - Define user journeys in YAML
- **AI Analysis** - Get smart recommendations for improvements

### 🚀 New Commands
```bash
arela run web              # Test web apps with Playwright
arela run web --flow signup # Run specific user flow
```
```

## QUICKSTART.md Updates
Add new section after "Step 6":
```markdown
### **Step 7: Test Your App Visually**

Run your app and let Arela test it like a real user:

```bash
# Start your dev server
npm run dev

# In another terminal, test it
arela run web

# Or test a specific flow
arela run web --flow signup
```

**Create a flow:**
```yaml
# .arela/flows/signup.yml
name: User Signup Flow
steps:
  - action: navigate
    target: /signup
  - action: click
    selector: button[data-testid="signup-button"]
  - action: type
    selector: input[name="email"]
    value: test@example.com
  - action: click
    selector: button[type="submit"]
```

**Output:**
```
🌐 Starting web app testing...
🧪 Running user flow: signup
  ✅ Navigate to /signup
  ✅ Click signup button
  ❌ Email field not visible
  
💡 Recommendations:
  1. Fix z-index on signup modal
```
```

## CHANGELOG.md Updates
```markdown
## [3.2.0] - 2025-11-11

### 🎭 Visual Testing with Playwright

**Test your apps like a real user would.**

### ✨ New Features

#### **arela run web Command**
- Launch and test web apps with Playwright
- Execute user flows defined in YAML
- Capture screenshots automatically
- Get AI-powered UX recommendations

#### **Flow-Based Testing**
- Define user journeys in `.arela/flows/*.yml`
- Support for navigate, click, type, waitFor, screenshot actions
- Error recovery and retry logic
- Detailed results reporting

#### **Playwright MCP Server**
- Interactive browser control from Windsurf
- Tools: navigate, click, type, screenshot, evaluate
- Persistent browser session across tool calls

### 🔧 Technical Details

**New Commands:**
- `arela run web` - Test web apps with Playwright
- `arela mcp --mode playwright` - Start Playwright MCP server

**New Files:**
- `src/run/web.ts` - Web test runner
- `src/run/flows.ts` - Flow loader and parser
- `src/run/reporter.ts` - Results reporter
- `src/mcp/playwright.ts` - Playwright MCP server

**Dependencies Added:**
- playwright: ^1.40.0

### 📊 Impact

- **Catch UX Issues Early** - Find problems before users do
- **Automated Testing** - No manual clicking required
- **AI Recommendations** - Get smart suggestions for fixes
- **Visual Proof** - Screenshots of every issue

### 🚀 Breaking Changes

None - Fully backward compatible.
```

## Tests Required
- Verify all links work
- Check code examples are accurate
- Ensure formatting is correct

## Report Required
- Summary of documentation updates
- Confirmation all files updated
- Links to updated docs
