# arela_translate

Convert natural language "vibes" into execution plans.

## Purpose

This is the **vibecoding interface**. It bridges the gap between:
- What you want: "Make the login page pop"
- What needs to happen: Specific files, changes, and steps

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vibe` | string | Yes | Natural language description of what you want |

## Returns

Structured JSON plan:

```json
{
  "summary": "Add dark mode toggle with sound feedback",
  "filesToCreate": [
    "src/components/DarkModeToggle.tsx"
  ],
  "filesToEdit": [
    "src/App.tsx",
    "src/styles/theme.css"
  ],
  "relevantContext": [
    "React component patterns",
    "CSS custom properties"
  ],
  "steps": [
    "Create toggle component with state management",
    "Add CSS variables for dark theme",
    "Import and place toggle in App",
    "Add audio playback on click"
  ]
}
```

## Example Usage

You say:
> "I want a button that plays a sound when clicked and looks premium"

AI calls:

```json
{
  "name": "arela_translate",
  "arguments": {
    "vibe": "Premium button with sound effect on click"
  }
}
```

## The Architect Persona

Under the hood, this tool prompts an LLM to act as a "Senior Software Architect" who:
- Understands the codebase context
- Breaks vague requests into concrete steps
- Identifies affected files
- Provides actionable plans

## Engine

- **Model:** OpenAI `gpt-4o-mini`
- **Temperature:** Low (for deterministic plans)
- **Response:** Structured JSON

## Configuration

Requires `OPENAI_API_KEY` in `.env`:

```
OPENAI_API_KEY=sk-your-key-here
```

## Implementation

Located in `slices/translate/ops.ts`.

## Related Tools

- [arela_focus](/tools/focus) — Manage context before translating
- [arela_vector_search](/tools/vector-search) — Find relevant code
