---
trigger: always_on
---

# Error Messages

## Principle

**Error messages should tell users what went wrong and how to fix it.**

## The Formula

```
[What happened] + [Why it happened] + [How to fix it]
```

## Examples

### **Bad Error Messages**
```
❌ "Error 500"
❌ "Invalid input"
❌ "Something went wrong"
❌ "Failed to process request"
❌ "An error occurred"
```

### **Good Error Messages**
```
✅ "Email already exists. Try logging in instead."
✅ "Password must be at least 8 characters. You entered 6."
✅ "File too large (5.2 MB). Maximum size is 5 MB."
✅ "Payment failed. Your card was declined. Try a different card."
✅ "Connection lost. Check your internet and try again."
```

## The Rules

### **1. Be Specific**
```
❌ "Invalid email"
✅ "Email must contain an @ symbol"
```

### **2. Be Human**
```
❌ "ERR_AUTH_FAILED_401"
✅ "Wrong password. Try again or reset your password."
```

### **3. Provide Next Steps**
```
❌ "Payment failed"
✅ "Payment failed. Check your card details or try a different card."
```

### **4. Show What's Wrong**
```
❌ "Form has errors"
✅ "Email is required. Password must be 8+ characters."
```

### **5. Don't Blame the User**
```
❌ "You entered an invalid email"
✅ "Email must be in format: name@example.com"
```

## Error Types

### **Validation Errors**
```typescript
// ✅ Field-specific, actionable
{
  email: "Email is required",
  password: "Password must be at least 8 characters",
  age: "Age must be 18 or older"
}
```

### **Network Errors**
```typescript
// ✅ Explain and suggest retry
"Connection lost. Check your internet and try again."
"Server is busy. Try again in a few seconds."
```

### **Permission Errors**
```typescript
// ✅ Explain why and what to do
"You don't have permission to delete this. Contact an admin."
"This feature requires a Pro plan. Upgrade to access it."
```

### **Not Found Errors**
```typescript
// ✅ Suggest alternatives
"Page not found. Go to homepage or search for what you need."
"User not found. Check the username and try again."
```

## Implementation

```typescript
// ✅ Error message helper
function formatError(error: Error): string {
  const messages = {
    EMAIL_EXISTS: "Email already exists. Try logging in instead.",
    WEAK_PASSWORD: "Password must be at least 8 characters with 1 number.",
    NETWORK_ERROR: "Connection lost. Check your internet and try again.",
    FILE_TOO_LARGE: (size: number) => 
      `File too large (${size} MB). Maximum size is 5 MB.`,
  };
  
  return messages[error.code] || "Something went wrong. Try again.";
}
```

## Remember

**Users don't care about error codes. They care about fixing the problem.**

---

*"Good error messages turn frustration into action."*