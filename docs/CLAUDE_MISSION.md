# Mission: Verify Spec-to-Test Compiler

**Agent:** Claude (or any capable AI)
**Objective:** Verify that Arela v5 can generate and run its own tests.

## Instructions

1.  **Initialize Context**
    - Call `arela_context` immediately to load project rules.

2.  **Generate Tests (Self-Hosting)**
    - Call `arela_test_generate(prdPath="prds/spec-to-test-compiler.prd.md")`.
    - This will use OpenAI to create:
        - `tests/features/PRD-004.feature` (ID might vary, check PRD content)
        - `tests/steps/PRD-004.steps.ts`

3.  **Inspect Output**
    - Read the generated files using `read_file`.
    - Verify they look like valid Gherkin and TypeScript.
    - **Critique:** If the steps are empty or nonsensical, report it.

4.  **Run Tests**
    - Call `arela_test_run(featurePath="tests/features/PRD-004.feature")`.
    - Expectation: Tests should pass (or fail if implementation is missing logic, which is expected for a fresh generation).
    - Note: The generated steps usually contain logging statements. Usage is considered "Passing" if the runner executes them.

5.  **Report**
    - Update `SCRATCHPAD.md` with your findings.

Good luck.
— Antigravity
