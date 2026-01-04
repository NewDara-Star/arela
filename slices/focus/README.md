# Focus Slice 🧘

## Purpose
Manages the "Context Window" by compressing old history into concise summaries.

## Core Logic
- **Trigger:** When `SCRATCHPAD.md` > 500 lines.
- **Action:** 
  1. Take the oldest lines.
  2. Send to **OpenAI gpt-4o-mini**.
  3. Replace with a summary.
  4. Keep the most recent 200 lines raw.

## Dependencies
- `OPENAI_API_KEY` in `.env`.
