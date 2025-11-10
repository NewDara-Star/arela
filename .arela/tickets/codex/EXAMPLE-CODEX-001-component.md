# Ticket: CODEX-001 - Create Input Component

**Agent:** @codex  
**Priority:** medium  
**Complexity:** simple  
**Estimated tokens:** 2000  
**Cost estimate:** $0.004  
**Dependencies:** None  
**Estimated time:** 15-20 minutes  

## Context

We need a reusable Input component for our design system. This is a standard form input with label, error states, and accessibility features.

## Requirements

- [ ] TypeScript React component
- [ ] Support for all HTML input types
- [ ] Label and error message support
- [ ] Accessible (ARIA labels, focus management)
- [ ] Styled with Tailwind CSS
- [ ] Storybook stories

## Acceptance Criteria

- [ ] Component renders with label
- [ ] Shows error state when error prop is provided
- [ ] Forwards ref to input element
- [ ] All input types work (text, email, password, etc.)
- [ ] Keyboard navigation works
- [ ] Screen reader announces label and errors

## Technical Specification

**File:** `packages/react/src/components/ui/input.tsx`

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    // Implementation here
  }
);
```

**Styling:**
- Use Tailwind CSS
- Error state: red border, red text
- Focus state: blue ring
- Disabled state: gray background

## Test Requirements

- [ ] Unit tests for all props
- [ ] Accessibility tests (jest-axe)
- [ ] Visual regression tests (Storybook)

## Definition of Done

- [ ] All requirements met
- [ ] All tests passing
- [ ] Storybook story created
- [ ] Exported from index.ts
- [ ] TypeScript types exported

## Example Usage

```tsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error="Invalid email address"
/>
```

---

**Estimated Cost:** $0.004 (2K tokens × $0.002)  
**Agent:** Codex (fast, pattern-based implementation)
