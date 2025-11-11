---
id: arela.state_management
title: State Management
category: frontend
severity: should
version: 1.0.0
---

# State Management

## Principle

**Use the simplest state solution that works.** Don't reach for Redux when useState is enough.

## The Hierarchy

### **1. Local State (useState)**
```tsx
// ✅ Use for: Component-specific state
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');
```

**When to use:**
- State used in one component
- UI state (modals, dropdowns, forms)
- Temporary state
- No need to share

### **2. Lifted State (Props)**
```tsx
// ✅ Use for: Shared state between siblings
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <ChildA count={count} />
      <ChildB setCount={setCount} />
    </>
  );
}
```

**When to use:**
- 2-3 components need the same state
- Parent-child relationship
- Simple data flow

### **3. Context (useContext)**
```tsx
// ✅ Use for: App-wide state (theme, auth, i18n)
const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Dashboard />
    </ThemeContext.Provider>
  );
}
```

**When to use:**
- Truly global state (auth, theme, locale)
- Avoid props drilling >3 levels
- Infrequent updates
- Read-heavy, write-light

### **4. URL State (useSearchParams)**
```tsx
// ✅ Use for: Shareable state
const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get('filter') || 'all';
```

**When to use:**
- Filters, sorting, pagination
- Shareable URLs
- Browser back/forward support
- Bookmarkable state

### **5. Server State (React Query/SWR)**
```tsx
// ✅ Use for: API data
const { data, isLoading } = useQuery('users', fetchUsers);
```

**When to use:**
- Data from APIs
- Caching needed
- Background refetching
- Optimistic updates

### **6. Global State (Zustand/Redux)**
```tsx
// ✅ Use for: Complex shared state
const useStore = create((set) => ({
  cart: [],
  addItem: (item) => set((state) => ({ 
    cart: [...state.cart, item] 
  })),
}));
```

**When to use:**
- Complex state logic
- Many components need same state
- Frequent updates
- Need devtools/time-travel

## Decision Tree

```
Where should this state live?

1. Is it used in only one component?
   → useState (local state)

2. Is it shared between 2-3 close components?
   → Lift state to common parent

3. Is it truly global (auth, theme, i18n)?
   → Context API

4. Should it be in the URL (filters, pagination)?
   → URL state (useSearchParams)

5. Is it data from an API?
   → React Query / SWR

6. Is it complex shared state with many updates?
   → Zustand / Redux
```

## Common Mistakes

### **1. Context for Everything**
```tsx
// ❌ Don't use Context for frequently changing state
const CountContext = createContext();

function App() {
  const [count, setCount] = useState(0); // Re-renders entire tree!
  return (
    <CountContext.Provider value={{ count, setCount }}>
      <Dashboard /> {/* Re-renders on every count change */}
    </CountContext.Provider>
  );
}
```

**Fix:** Use local state or a proper state manager.

### **2. Premature Redux**
```tsx
// ❌ Redux for simple state
const store = createStore(reducer);
// Just to store: { isModalOpen: false }
```

**Fix:** Start with useState. Add complexity only when needed.

### **3. Props Drilling Instead of Context**
```tsx
// ❌ Drilling props through 5 levels
<A user={user}>
  <B user={user}>
    <C user={user}>
      <D user={user}>
        <E user={user} /> {/* Finally uses it */}
      </D>
    </C>
  </B>
</A>
```

**Fix:** Use Context after 3 levels.

### **4. Not Using URL State**
```tsx
// ❌ Filters in local state (not shareable)
const [filter, setFilter] = useState('all');
```

**Fix:** Put it in the URL for shareability.

## Server State is Different

**Don't store API data in useState/Redux:**

```tsx
// ❌ Manual API state management
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch('/api/users')
    .then(res => res.json())
    .then(data => setUsers(data))
    .catch(err => setError(err))
    .finally(() => setLoading(false));
}, []);
```

```tsx
// ✅ Use React Query
const { data: users, isLoading, error } = useQuery('users', fetchUsers);
```

**Benefits:**
- Automatic caching
- Background refetching
- Deduplication
- Optimistic updates
- Less boilerplate

## Form State

### **Simple Forms**
```tsx
// ✅ Controlled components
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
```

### **Complex Forms**
```tsx
// ✅ Use React Hook Form
const { register, handleSubmit } = useForm();
```

**Use a library when:**
- 5+ fields
- Complex validation
- Multi-step forms
- File uploads

## State Colocation

**Keep state as close to where it's used as possible:**

```tsx
// ❌ State too high
function App() {
  const [modalOpen, setModalOpen] = useState(false); // Only used in Settings
  return (
    <Dashboard>
      <Settings modalOpen={modalOpen} setModalOpen={setModalOpen} />
    </Dashboard>
  );
}

// ✅ State colocated
function Settings() {
  const [modalOpen, setModalOpen] = useState(false); // Right where it's used
  return <Modal open={modalOpen} />;
}
```

## The Zustand Sweet Spot

**When to use Zustand over Context:**

```tsx
// ✅ Zustand for complex shared state
const useCartStore = create((set) => ({
  items: [],
  total: 0,
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
    total: state.total + item.price,
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id),
    total: state.items.reduce((sum, i) => sum + i.price, 0),
  })),
}));

// No Provider needed, no re-render issues
function Cart() {
  const items = useCartStore(state => state.items); // Only re-renders when items change
}
```

**Benefits over Context:**
- No Provider wrapper
- Selective subscriptions (no unnecessary re-renders)
- Simpler API
- Built-in devtools

## Remember

**Start simple. Add complexity only when you feel pain.**

The best state management solution is the one you don't need yet.

---

*"Make it work, make it right, make it fast."*  
*- Kent Beck*

*Start with "make it work" (useState), then "make it right" (proper state solution).*
