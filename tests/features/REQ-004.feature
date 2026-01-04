Feature: Context Engine
  Feature ID: REQ-004

  Scenario: Context Teleportation
    Given I am a user of the context engine
    When I access the context of a project
    Then I immediately know the project rules and previous work history

  Scenario: Memory Persistence
    Given I am a user of the context engine
    When I complete a task
    Then my work is saved for the next agent

  Scenario: Rule Enforcement (The Gatekeeper)
    Given I am a Project Owner
    When a new agent attempts to use the tools
    Then all tools are blocked until `arela_context` is called
    And no agent acts without reading the rules first