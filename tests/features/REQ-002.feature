Feature: Spec-to-Test Compiler
  Feature ID: REQ-002

  Scenario: Generate Gherkin from User Stories
    Given a PRD with user stories
    When I call `arela_test_generate`
    Then Gherkin `.feature` files are created

    Given user story acceptance criteria in Given/When/Then format
    When generated
    Then they map directly to Gherkin scenarios

    Given a user story without proper format
    When generated
    Then the AI infers reasonable scenarios

  Scenario: Generate Playwright Step Definitions
    Given a `.feature` file
    When I call `arela_test_generate` with stepDefs option
    Then TypeScript step definitions are created

    Given step definitions are generated
    When I run Playwright
    Then tests execute (may fail, but run)

    Given accessibility locators exist
    When generated
    Then tests use `getByRole` over CSS selectors

  Scenario: Watch Mode for Continuous Testing
    Given watch mode is enabled
    When PRD user stories change
    Then affected tests regenerate

    Given watch mode is enabled
    When code changes
    Then affected tests run automatically

    Given a test fails
    When in watch mode
    Then notification is shown