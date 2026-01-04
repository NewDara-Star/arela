Feature: Investigation State Machine
  Feature ID: REQ-008

  Scenario: Symptom Logging (Start)
    Given the session is in the initial state
    When a symptom is logged
    Then the session enters ANALYSIS mode

  Scenario: Hypothesis Registration
    Given the session is in ANALYSIS mode
    When a hypothesis is registered
    Then the session enters VERIFICATION mode

  Scenario: Hypothesis Confirmation
    Given the session is in VERIFICATION mode
    When a hypothesis is confirmed
    Then the session enters IMPLEMENTATION mode

  Scenario: Escalation
    Given the session is in any mode
    When a condition for escalation is met
    Then the session does not loop endlessly