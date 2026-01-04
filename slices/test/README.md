# Test Slice (Spec-to-Test Compiler)

This slice implements the "Vibecoding Engine" — the ability to translate natural language specifications (PRDs) into executable tests.

## Tools

### `arela_test_generate`
- **Input:** PRD Path
- **Process:**
  1. Reads PRD and extracts User Stories.
  2. Uses LLM to generate Gherkin `.feature` file.
  3. Uses LLM to generate Playwright `.ts` step definitions.
- **Output:** Files in `tests/features` and `tests/steps`.

### `arela_test_run`
- **Input:** PRD Path (maps to feature file)
- **Process:** Runs the Generated Test via Playwright/Cucumber.
- **Output:** Pass/Fail report.

## Philosophy
**"BDD as Compiler Check"**: The test confirms that the code matches the intention (PRD). If the test fails, either the code is wrong OR the PRD is wrong.
