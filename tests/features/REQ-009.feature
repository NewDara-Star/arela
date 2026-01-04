Feature: Vector Search (RAG)
  Feature ID: REQ-009

  Scenario: Indexing
    Given the codebase is scanned
    When embeddings are created
    Then the system stores the embeddings for future searches

  Scenario: Semantic Search
    Given relevant files exist in the system
    When a user searches for terms related to the content
    Then the system returns relevant files even if they don't contain those exact words