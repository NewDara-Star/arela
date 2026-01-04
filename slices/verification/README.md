# Verification Slice

## Purpose
Programmatically enforce truth and prevent hallucinations by verifying claims against actual file content.

## Concepts
- **Gatekeeper:** The logic that verifies a claim.
- **Evidence:** The file or resource being checked.
- **Probe:** The method of checking (grep, regex, or LLM).

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_verify` | Verify a claim about a file using regex or substring matching. |

## Usage
Before stating a fact (e.g., "The file uses X"), the AI calls `arela_verify`.
- If TRUE: The AI proceeds.
- If FALSE: The AI self-corrects ("I thought it used X, but verified it does not").
