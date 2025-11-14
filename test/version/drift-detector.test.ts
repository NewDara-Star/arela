import { describe, it, expect } from "vitest";
import { compareSpecs } from "../../src/version/drift-detector.js";
import { compareSchemas } from "../../src/version/schema-comparator.js";

describe("version drift detection", () => {
  it("detects removed endpoints and operations", () => {
    const previous = {
      paths: {
        "/workout": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const current = {
      paths: {},
    };

    const changes = compareSpecs(current, previous, "openapi/workout.yaml");
    const removedEndpoint = changes.find((change) => change.type === "removed-endpoint");

    expect(removedEndpoint).toBeDefined();
    expect(removedEndpoint?.field).toBe("/workout");
  });

  it("surfaces schema differences", () => {
    const previous = {
      paths: {
        "/session": {
          post: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["id"],
                      properties: {
                        id: { type: "string" },
                        reps: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const current = {
      paths: {
        "/session": {
          post: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const changes = compareSpecs(current, previous, "openapi/workout.yaml");
    const removedField = changes.find(
      (change) => change.type === "removed-field" && change.field.includes("reps")
    );
    const typeChange = changes.find((change) => change.type === "changed-type");

    expect(removedField).toBeDefined();
    expect(removedField?.field).toContain("reps");
    expect(typeChange).toBeDefined();
    expect(typeChange?.field).toBe("id");
  });
});

describe("schema comparator", () => {
  it("detects nested property type churn", () => {
    const previous = {
      type: "object",
      properties: {
        stats: {
          type: "object",
          properties: {
            reps: { type: "number" },
          },
        },
      },
    };

    const current = {
      type: "object",
      properties: {
        stats: {
          type: "object",
          properties: {
            reps: { type: "string" },
          },
        },
      },
    };

    const changes = compareSchemas(current, previous);
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("stats.reps");
    expect(changes[0].type).toBe("changed-type");
  });
});
