Feature: Automated Regression Prevention
  Feature ID: REQ-005

  Scenario: The "Never Again" Command
    Given the user has created a programmatic check
    When the user says "You forgot to document the new tool"
    Then Arela should create a check called 'check_doc_coverage'

  Scenario: Linter Generation
    Given the system has detected natural language failures
    When the system generates ESLint rules or Git Hooks
    Then the codebase should become stricter over time