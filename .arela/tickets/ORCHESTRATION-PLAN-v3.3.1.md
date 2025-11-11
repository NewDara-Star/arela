# Arela v3.3.1 Orchestration Plan

## 🎯 Goal
Add intelligent web fallback for mobile testing when Appium/simulators aren't available.

## 💡 The Idea
**User's brilliant insight:** "In case there is no mobile simulator, it should simulate the app in a browser, maybe make the frame the size of a mobile phone"

## 📋 Ticket Created

### **CLAUDE-002: Mobile Web Fallback**
- Detect Appium connection failure
- Fallback to Playwright with mobile viewport
- iOS dimensions: 390x844 (iPhone 15 Pro)
- Android dimensions: 412x915 (Pixel 7)
- Add `--web-fallback` flag to force mode
- Perfect for Expo apps!

**Estimated Time:** 1-2 hours  
**Complexity:** Medium

## 🎯 Why This Matters

**Current behavior (v3.3.0):**
```bash
$ arela run mobile
❌ No app found
```

**New behavior (v3.3.1):**
```bash
$ arela run mobile
⚠️  Appium not available, falling back to web mode
📱 Testing with mobile viewport (390x844)
✅ 4 steps passed
```

## 🚀 Benefits

1. **Better UX** - No hard failures
2. **Faster** - No simulator boot time
3. **CI/CD Friendly** - Works without simulators
4. **Expo Perfect** - Most Expo apps run on web
5. **Same Flows** - No changes needed
6. **Screenshots** - Still captured

## 📊 Use Cases

**1. Quick Testing:**
```bash
# Just want to see if it works
arela run mobile --flow test
# Falls back to web automatically
```

**2. Expo Apps:**
```bash
# Expo apps run on web by default
npx expo start --web
arela run mobile --flow onboarding
# Perfect!
```

**3. CI/CD:**
```bash
# No simulators in CI
arela run mobile --web-fallback --flow smoke-test
# Works every time
```

**4. Force Web Mode:**
```bash
# Even if Appium is available
arela run mobile --web-fallback --flow test
# Faster iteration
```

## 🎬 Execution

**When ready for v3.3.1:**
```bash
arela orchestrate --tickets CLAUDE-002-v3.3.1-mobile-web-fallback
```

Or manually assign to Claude.

## 📝 Notes

**This is a TWO-WAY DOOR decision:**
- Easy to implement
- Easy to revert if needed
- Doesn't break existing functionality
- Pure enhancement

**Philosophy alignment:**
- **Good Taste:** Graceful degradation
- **Pragmatic:** Works without setup
- **User-First:** Better experience

## 🎉 Impact

**v3.3.0:** Mobile testing requires Appium + simulator  
**v3.3.1:** Mobile testing works EVERYWHERE

**This makes mobile testing accessible to everyone!**

---

**Status:** Ready for implementation  
**Priority:** High (great UX improvement)  
**Risk:** Low (fallback only, doesn't change core)
