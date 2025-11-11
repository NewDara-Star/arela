---
id: arela.component_architecture
title: Component Architecture
category: frontend
severity: should
version: 1.0.0
---

# Component Architecture

## Principle

**Components should do one thing well.** Split when complexity grows, not preemptively.

## The Rule

### ✅ **Split a Component When:**
- **>300 lines** - Getting hard to navigate
- **Multiple responsibilities** - Doing more than one thing
- **Reused in 3+ places** - Extract for reusability
- **Complex state logic** - State management is tangled
- **Hard to test** - Too many dependencies

### ❌ **Don't Split When:**
- **<100 lines** - Premature abstraction
- **Used once** - YAGNI applies
- **Tightly coupled** - Would need props drilling
- **Simple logic** - Complexity is manageable

## Component Types

### **1. Page Components**
```tsx
// pages/Dashboard.tsx
// - Route-level component
// - Fetches data
// - Composes feature components
// - Handles layout
```

### **2. Feature Components**
```tsx
// features/UserProfile.tsx
// - Business logic
// - State management
// - Composes UI components
// - Domain-specific
```

### **3. UI Components**
```tsx
// components/Button.tsx
// - Pure presentation
// - No business logic
// - Highly reusable
// - Design system aligned
```

### **4. Layout Components**
```tsx
// layouts/DashboardLayout.tsx
// - Structure and positioning
// - Responsive behavior
// - No business logic
```

## File Structure

```
src/
├── pages/              # Route components
│   └── Dashboard.tsx
├── features/           # Feature components
│   ├── UserProfile/
│   │   ├── index.tsx
│   │   ├── UserAvatar.tsx
│   │   └── UserStats.tsx
├── components/         # Reusable UI
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Input.tsx
└── layouts/            # Layout components
    └── DashboardLayout.tsx
```

## Composition Over Props Drilling

### **Bad: Props Drilling**
```tsx
<Dashboard>
  <Header user={user} theme={theme} />
  <Sidebar user={user} theme={theme} />
  <Content user={user} theme={theme} />
</Dashboard>
```

### **Good: Context/Composition**
```tsx
<UserProvider value={user}>
  <ThemeProvider value={theme}>
    <Dashboard>
      <Header />
      <Sidebar />
      <Content />
    </Dashboard>
  </ThemeProvider>
</UserProvider>
```

## The 300-Line Rule

**If a component exceeds 300 lines:**

1. **Extract subcomponents** - Look for logical sections
2. **Extract hooks** - Move complex logic to custom hooks
3. **Extract utilities** - Move pure functions to utils
4. **Simplify conditionals** - Use early returns, guard clauses

## Naming Conventions

- **PascalCase** for components: `UserProfile.tsx`
- **Descriptive names** - What it does, not how: `UserProfileCard` not `BlueBox`
- **Suffix with type** - `UserProfileModal`, `UserProfileForm`
- **Avoid generic names** - `Card` is fine, `Container` is not

## Testing Strategy

### **UI Components**
- Test rendering
- Test props variations
- Test user interactions
- Snapshot tests (sparingly)

### **Feature Components**
- Test business logic
- Test state changes
- Test side effects
- Mock external dependencies

## Common Mistakes

### **1. God Components**
```tsx
// ❌ 1000-line component doing everything
<Dashboard>
  {/* 500 lines of JSX */}
</Dashboard>
```

### **2. Premature Abstraction**
```tsx
// ❌ Creating components used once
<UserProfileHeaderTitleText>John</UserProfileHeaderTitleText>
```

### **3. Props Explosion**
```tsx
// ❌ Too many props
<Button 
  size="large"
  color="blue"
  variant="outlined"
  disabled={false}
  loading={false}
  icon="check"
  iconPosition="left"
  onClick={handleClick}
  onHover={handleHover}
  onFocus={handleFocus}
  // ... 10 more props
/>
```

### **4. Tight Coupling**
```tsx
// ❌ Component knows too much about parent
function UserCard() {
  const { user, updateUser, deleteUser, permissions } = useParentContext();
  // Tightly coupled to parent's structure
}
```

## Decision Tree

```
Need to split component?
├─ Is it >300 lines?
│  ├─ Yes → Split by logical sections
│  └─ No → Continue
├─ Does it have multiple responsibilities?
│  ├─ Yes → Extract by responsibility
│  └─ No → Continue
├─ Is it reused 3+ times?
│  ├─ Yes → Extract to shared component
│  └─ No → Keep it inline
└─ Is it hard to test?
   ├─ Yes → Extract complex logic to hooks
   └─ No → Keep as is
```

## Remember

**Start simple. Split when you feel pain, not before.**

Premature abstraction is worse than a slightly long component.

---

*"Duplication is far cheaper than the wrong abstraction."*  
*- Sandi Metz*
