Feature: Guarded Filesystem
  Feature ID: REQ-007
  
  Scenario: Write Blocking
    Given the Safety System is active
    When an attempt is made to write to the filesystem
    Then the write operation should be blocked

  Scenario: Write Tracking
    Given I am diagnosing a bug
    When I attempt to change code within the filesystem
    Then a warning should be issued to indicate write changes are not allowed

  Scenario: Read Availability
    Given the filesystem is accessible
    When I attempt to read from the filesystem
    Then I should be able to gather information without impediment