/**
 * JSON Schema for YAML ticket validation
 */
export const ticketYamlSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "ARELA Ticket Schema",
  description:
    "Schema for ARELA YAML ticket format with comprehensive metadata support",
  type: "object",
  required: ["id", "title"],
  properties: {
    id: {
      type: "string",
      description: "Unique ticket identifier (e.g., CODEX-001, ARELA-004)",
      pattern: "^[A-Z0-9]+-[0-9]+$",
    },
    title: {
      type: "string",
      description: "Short, descriptive title for the ticket",
      minLength: 3,
      maxLength: 200,
    },
    description: {
      type: "string",
      description: "Optional longer description",
    },
    agent: {
      type: "string",
      description:
        "Suggested agent for this ticket (codex, openai, claude, deepseek, ollama, cascade)",
      enum: ["codex", "openai", "claude", "deepseek", "ollama", "cascade"],
    },
    priority: {
      type: "string",
      description: "Priority level for the ticket",
      enum: ["low", "medium", "high", "highest"],
      default: "medium",
    },
    complexity: {
      type: "string",
      description: "Complexity estimation for the ticket",
      enum: ["simple", "medium", "complex"],
      default: "medium",
    },
    status: {
      type: "string",
      description: "Current status of the ticket",
      enum: ["pending", "in_progress", "completed", "failed", "blocked"],
      default: "pending",
    },
    estimated_time: {
      type: "string",
      description: "Estimated time to complete (e.g., 30m, 2h, 1d)",
      pattern: "^\\d+[mhd]$",
    },
    estimated_cost: {
      type: "string",
      description: "Estimated API cost (e.g., $0.15, $2.50)",
      pattern: "^\\$[0-9]+(\\.[0-9]{2})?$",
    },

    context: {
      type: "string",
      description:
        "Context and background information for this ticket (supports multiline)",
    },

    requirements: {
      type: "array",
      description: "List of requirements for this ticket",
      items: {
        type: "string",
      },
    },

    acceptance: {
      type: "array",
      description: "Acceptance criteria with optional test commands",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for this acceptance criterion",
          },
          description: {
            type: "string",
            description: "Description of the acceptance criterion",
          },
          status: {
            type: "string",
            description: "Status of this criterion",
            enum: ["pending", "passed", "failed"],
            default: "pending",
          },
          test: {
            type: "string",
            description:
              "Optional test command to validate this criterion (bash, npm, etc)",
          },
        },
        required: ["description"],
      },
    },

    files: {
      type: "array",
      description: "Files affected or created by this ticket",
      items: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path",
          },
          action: {
            type: "string",
            description: "Action to perform on this file",
            enum: ["create", "modify", "delete"],
          },
          description: {
            type: "string",
            description: "What changes will be made to this file",
          },
        },
        required: ["path", "action"],
      },
    },

    dependencies: {
      oneOf: [
        {
          type: "array",
          description: "Ticket IDs that must be completed before this one",
          items: {
            type: "string",
            pattern: "^[A-Z0-9]+-[0-9]+$",
          },
        },
        {
          type: "string",
          description: "Comma-separated list of ticket dependencies",
        },
      ],
    },

    tags: {
      type: "array",
      description: "Tags for categorizing this ticket",
      items: {
        type: "string",
      },
    },

    assignee: {
      type: "string",
      description: "Person or agent assigned to this ticket",
    },

    created_at: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp when ticket was created",
    },

    updated_at: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp when ticket was last updated",
    },

    completed_at: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp when ticket was completed",
    },

    labels: {
      type: "array",
      description: "Labels for the ticket (alternative to tags)",
      items: {
        type: "string",
      },
    },
  },

  additionalProperties: true,
};

/**
 * Validate a ticket object against the schema
 */
export function validateTicket(
  ticket: unknown,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof ticket !== "object" || ticket === null) {
    return { valid: false, errors: ["Ticket must be an object"] };
  }

  const t = ticket as Record<string, unknown>;

  // Check required fields
  if (!t.id || typeof t.id !== "string") {
    errors.push("Missing required field: id");
  } else if (!/^[A-Z0-9]+-[0-9]+$/.test(t.id)) {
    errors.push(`Invalid id format: ${t.id} (expected: PREFIX-001)`);
  }

  if (!t.title || typeof t.title !== "string") {
    errors.push("Missing required field: title");
  } else if (t.title.length < 3) {
    errors.push("Title must be at least 3 characters");
  }

  // Check optional enum fields
  if (t.agent && !["codex", "openai", "claude", "deepseek", "ollama", "cascade"].includes(String(t.agent))) {
    errors.push(
      `Invalid agent: ${t.agent} (must be one of: codex, openai, claude, deepseek, ollama, cascade)`,
    );
  }

  if (t.priority && !["low", "medium", "high", "highest"].includes(String(t.priority))) {
    errors.push(`Invalid priority: ${t.priority}`);
  }

  if (t.complexity && !["simple", "medium", "complex"].includes(String(t.complexity))) {
    errors.push(`Invalid complexity: ${t.complexity}`);
  }

  if (t.status && !["pending", "in_progress", "completed", "failed", "blocked"].includes(String(t.status))) {
    errors.push(`Invalid status: ${t.status}`);
  }

  // Check estimated_time format
  if (t.estimated_time && !/^\d+[mhd]$/.test(String(t.estimated_time))) {
    errors.push(
      `Invalid estimated_time format: ${t.estimated_time} (expected: e.g., 30m, 2h, 1d)`,
    );
  }

  // Check estimated_cost format
  if (t.estimated_cost && !/^\$[0-9]+(\.[0-9]{2})?$/.test(String(t.estimated_cost))) {
    errors.push(
      `Invalid estimated_cost format: ${t.estimated_cost} (expected: e.g., $0.15, $2.50)`,
    );
  }

  // Check dependencies format
  if (t.dependencies) {
    if (Array.isArray(t.dependencies)) {
      for (const dep of t.dependencies) {
        if (typeof dep !== "string" || !/^[A-Z0-9]+-[0-9]+$/.test(dep)) {
          errors.push(`Invalid dependency format: ${dep}`);
        }
      }
    } else if (typeof t.dependencies !== "string") {
      errors.push("Dependencies must be an array or comma-separated string");
    }
  }

  // Check acceptance criteria
  if (t.acceptance && Array.isArray(t.acceptance)) {
    for (let i = 0; i < t.acceptance.length; i++) {
      const ac = t.acceptance[i];
      if (typeof ac !== "object" || ac === null) {
        errors.push(`Invalid acceptance criterion at index ${i}`);
      } else if (!ac.description) {
        errors.push(`Acceptance criterion at index ${i} missing description`);
      }
    }
  }

  // Check files
  if (t.files && Array.isArray(t.files)) {
    for (let i = 0; i < t.files.length; i++) {
      const file = t.files[i];
      if (typeof file !== "object" || file === null) {
        errors.push(`Invalid file entry at index ${i}`);
      } else {
        if (!file.path) {
          errors.push(`File entry at index ${i} missing path`);
        }
        if (!file.action) {
          errors.push(`File entry at index ${i} missing action`);
        } else if (!["create", "modify", "delete"].includes(String(file.action))) {
          errors.push(
            `Invalid file action at index ${i}: ${file.action} (must be: create, modify, or delete)`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
