Feature: Context Rolling (Focus)
  Feature ID: REQ-012

  Scenario: Archival of the current scratchpad
    Given the user has a scratchpad with content
    When the user triggers the archival process
    Then the current scratchpad is saved to a timestamped file

  Scenario: Summarization of the scratchpad content
    Given the user has a scratchpad with content
    When the user triggers the summarization process
    Then the context is maintained without token overload