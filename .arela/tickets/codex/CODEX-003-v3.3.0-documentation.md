# CODEX-003: Update Documentation for v3.3.0

**Agent:** codex  
**Priority:** medium  
**Complexity:** simple  
**Status:** pending  
**Depends on:** CODEX-002

## Context
Update README, QUICKSTART, and CHANGELOG for v3.3.0 mobile testing features.

## Technical Task
Update documentation files:
- README.md - Add v3.3.0 features
- QUICKSTART.md - Add mobile testing guide
- CHANGELOG.md - Document v3.3.0 changes

## Acceptance Criteria
- [ ] README updated with mobile testing features
- [ ] QUICKSTART has step-by-step guide for mobile testing
- [ ] CHANGELOG documents all v3.3.0 changes
- [ ] Examples are clear and accurate
- [ ] Version numbers updated throughout

## Files to Modify
- `README.md`
- `QUICKSTART.md`
- `CHANGELOG.md`

## README.md Updates
Update version and add mobile testing:
```markdown
# Arela v3.3.0

## ✨ What's New in v3.3.0

### 📱 Mobile Testing with Appium
- **Test Mobile Apps** - Arela can now test iOS and Android apps
- **Simulator Support** - Works with iOS Simulator and Android Emulator
- **Expo Integration** - Auto-detects and tests Expo apps
- **Cross-Platform** - Same flow format for web and mobile

### 🚀 New Commands
```bash
arela run mobile                    # Test iOS app (default)
arela run mobile --platform android # Test Android app
arela run mobile --flow onboarding  # Run specific flow
```

## Current Status
✅ **Live on npm** - v3.3.0 with web + mobile testing
```

## QUICKSTART.md Updates
Add mobile testing section after web testing:
```markdown
### **Step 8: Test Your Mobile App**

Test iOS or Android apps with Appium:

```bash
# Start your Expo app
npx expo start

# In another terminal, test it
arela run mobile

# Or test Android
arela run mobile --platform android
```

**Create a mobile flow:**
```yaml
# .arela/flows/onboarding.yml
name: Mobile Onboarding Flow
steps:
  - action: click
    selector: ~get-started-button  # iOS accessibility ID
  - action: swipe
    direction: left
  - action: click
    selector: ~next-button
  - action: screenshot
    name: onboarding-complete
```

**Output:**
```
📱 Starting mobile app testing...
🍎 Launching iOS Simulator (iPhone 15 Pro)

🧪 Running user flow: onboarding
  ✅ Tap get-started button
  ✅ Swipe left
  ✅ Tap next button
  ✅ Captured screenshot
  
📊 Results:
  - 4 steps passed

📸 Screenshots saved to .arela/screenshots/mobile/
```
```

## CHANGELOG.md Updates
```markdown
## [3.3.0] - 2025-11-11

### 📱 Mobile Testing with Appium

**Test iOS and Android apps like a real user.**

### ✨ New Features

#### **arela run mobile Command**
- Launch and test mobile apps with Appium
- Execute user flows defined in YAML
- Capture screenshots automatically
- Support for iOS Simulator and Android Emulator
- Auto-detect Expo apps

#### **Cross-Platform Support**
- iOS testing via XCUITest driver
- Android testing via UIAutomator2 driver
- Same flow format as web testing
- Platform-specific selectors (accessibility IDs, resource IDs)

#### **Mobile-Specific Actions**
- Swipe gestures (up, down, left, right)
- Tap with coordinates
- Long press
- Scroll to element

### 🔧 Technical Details

**New Commands:**
- `arela run mobile` - Test mobile apps with Appium
- `arela run mobile --platform android` - Test Android apps
- `arela run mobile --device "iPhone 15 Pro"` - Specify device

**New Files:**
- `src/run/mobile.ts` - Mobile test runner

**Dependencies Added:**
- appium: ^2.0.0
- appium-xcuitest-driver: ^5.0.0
- appium-uiautomator2-driver: ^3.0.0
- webdriverio: ^8.0.0

### 📊 Impact

- **Test Mobile Apps** - No manual tapping required
- **Expo Support** - Auto-detects and tests Expo apps
- **Cross-Platform** - Same flows work on iOS and Android
- **Visual Proof** - Screenshots of every step

### 🚀 Breaking Changes

None - Fully backward compatible.

### 📱 Platform Support

**iOS:**
- Requires Xcode and iOS Simulator
- Uses XCUITest driver
- Accessibility IDs for selectors

**Android:**
- Requires Android Studio and Emulator
- Uses UIAutomator2 driver
- Resource IDs for selectors

**Expo:**
- Auto-detects Expo apps
- Works with `npx expo start`
- No additional configuration needed
```

## Tests Required
- Verify all links work
- Check code examples are accurate
- Ensure formatting is correct

## Report Required
- Summary of documentation updates
- Confirmation all files updated
- Links to updated docs
