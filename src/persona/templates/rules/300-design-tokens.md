---
id: arela.design_tokens
title: Design Tokens
category: design
severity: should
version: 1.0.0
---

# Design Tokens

## Principle

**Design tokens are the single source of truth for design decisions.** Colors, spacing, typography—all defined once, used everywhere.

## What Are Design Tokens?

Design tokens are named entities that store visual design attributes:

```typescript
// ✅ Design tokens
const tokens = {
  colors: {
    primary: '#3B82F6',
    danger: '#EF4444',
    surface: '#FFFFFF',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
    },
  },
};
```

## The System

### **1. Color Tokens**

```typescript
// ✅ Semantic color names
colors: {
  // Brand
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  
  // Feedback
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Neutral
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    // ... up to 900
  },
  
  // Surfaces
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  
  // Text
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    disabled: '#9CA3AF',
  },
}
```

**❌ Don't use:**
- `blue`, `red`, `green` (not semantic)
- Hex codes directly in components
- Inconsistent naming

### **2. Spacing Tokens**

```typescript
// ✅ T-shirt sizing
spacing: {
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem
  md: '16px',   // 1rem
  lg: '24px',   // 1.5rem
  xl: '32px',   // 2rem
  '2xl': '48px', // 3rem
  '3xl': '64px', // 4rem
}

// Or numeric scale
spacing: {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
}
```

**Use for:**
- Padding
- Margin
- Gap (flexbox/grid)
- Positioning (top, left, etc.)

### **3. Typography Tokens**

```typescript
// ✅ Typography scale
typography: {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Fira Code, monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}
```

### **4. Border Radius Tokens**

```typescript
// ✅ Consistent rounding
borderRadius: {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px', // Pills/circles
}
```

### **5. Shadow Tokens**

```typescript
// ✅ Elevation system
shadows: {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}
```

## Implementation

### **Tailwind CSS**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: tokens.colors,
      spacing: tokens.spacing,
      fontFamily: tokens.typography.fontFamily,
    },
  },
};
```

### **CSS Variables**
```css
:root {
  /* Colors */
  --color-primary: #3B82F6;
  --color-danger: #EF4444;
  
  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  
  /* Typography */
  --font-sans: Inter, system-ui, sans-serif;
  --font-size-base: 16px;
}

/* Usage */
.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
  font-family: var(--font-sans);
}
```

### **TypeScript**
```typescript
// tokens.ts
export const tokens = {
  colors: { /* ... */ },
  spacing: { /* ... */ },
} as const;

// Usage
import { tokens } from './tokens';

const Button = styled.button`
  background: ${tokens.colors.primary};
  padding: ${tokens.spacing.md};
`;
```

## Dark Mode

```typescript
// ✅ Semantic tokens that change with theme
const tokens = {
  colors: {
    background: {
      light: '#FFFFFF',
      dark: '#111827',
    },
    text: {
      primary: {
        light: '#111827',
        dark: '#F9FAFB',
      },
    },
  },
};

// CSS Variables approach
:root {
  --color-background: #FFFFFF;
  --color-text: #111827;
}

[data-theme="dark"] {
  --color-background: #111827;
  --color-text: #F9FAFB;
}
```

## Common Mistakes

### **1. Magic Numbers**
```tsx
// ❌ Hardcoded values
<div style={{ padding: '17px', margin: '23px' }}>
```

```tsx
// ✅ Use tokens
<div style={{ padding: tokens.spacing.md, margin: tokens.spacing.lg }}>
```

### **2. Non-Semantic Names**
```typescript
// ❌ Implementation-based names
colors: {
  blue500: '#3B82F6',
  red400: '#EF4444',
}
```

```typescript
// ✅ Semantic names
colors: {
  primary: '#3B82F6',
  danger: '#EF4444',
}
```

### **3. Inconsistent Spacing**
```tsx
// ❌ Random spacing values
<div style={{ marginTop: '15px', marginBottom: '18px' }}>
```

```tsx
// ✅ Consistent spacing scale
<div style={{ marginTop: tokens.spacing.md, marginBottom: tokens.spacing.lg }}>
```

## The 8px Grid

**Base spacing on multiples of 8:**

```typescript
spacing: {
  1: '8px',   // 8 * 1
  2: '16px',  // 8 * 2
  3: '24px',  // 8 * 3
  4: '32px',  // 8 * 4
  6: '48px',  // 8 * 6
  8: '64px',  // 8 * 8
}
```

**Why 8px?**
- Most screens are divisible by 8
- Creates visual rhythm
- Easy mental math
- Industry standard

## Documentation

**Document your tokens:**

```markdown
# Design Tokens

## Colors

### Primary
- **Token:** `colors.primary`
- **Value:** `#3B82F6`
- **Usage:** Primary actions, links, focus states

### Danger
- **Token:** `colors.danger`
- **Value:** `#EF4444`
- **Usage:** Destructive actions, errors, alerts
```

## Tooling

**Generate tokens from Figma:**
- Style Dictionary
- Figma Tokens plugin
- Design Tokens Studio

**Validate tokens:**
- Contrast ratios (WCAG)
- Color blindness simulation
- Spacing consistency

## Remember

**Design tokens are not just for designers—they're for everyone.**

Engineers, designers, and product all speak the same language.

---

*"A design system is a shared language between designers and developers."*  
*- Brad Frost*
