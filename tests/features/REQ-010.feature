@REQ-010
Feature: Dependency Graph (Impact Analysis)
  As a Developer
  I want to perform impact analysis on my code
  So that I can see what imports it (Upstream) and what it imports (Downstream)

  Scenario: Viewing the dependency graph for impact analysis
    Given I have a codebase with existing dependencies
    When I view the dependency graph
    Then I should see the upstream imports for the selected module
    And I should see the downstream imports for the selected module

  Scenario: Refreshing the dependency graph after making changes
    Given I have modified the codebase
    When I refresh the dependency graph
    Then the graph should be rebuilt to reflect my changes