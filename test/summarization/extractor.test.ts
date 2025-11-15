import { describe, it, expect } from "vitest";
import {
  ASTExtractor,
  type SemanticContract,
} from "../../src/summarization/extractor/index.js";

describe("ASTExtractor - CODEX-001 AST Extractor", () => {
  const extractor = new ASTExtractor();

  async function extract(code: string): Promise<SemanticContract> {
    return extractor.extract(code, "src/example.ts");
  }

  it("extracts simple exported function with signature", async () => {
    const code = `
export function add(a: number, b: number): number {
  return a + b;
}
`;

    const contract = await extract(code);

    expect(contract.exports).toHaveLength(1);
    const fn = contract.exports[0];

    expect(fn.name).toBe("add");
    expect(fn.kind).toBe("function");
    expect(fn.signature).toBeDefined();
    expect(fn.signature?.isAsync).toBe(false);
    expect(fn.signature?.returnType).toBe("number");
    expect(fn.signature?.params).toHaveLength(2);
    expect(fn.signature?.params[0]).toMatchObject({
      name: "a",
      type: "number",
      optional: false,
    });
    expect(fn.signature?.params[1]).toMatchObject({
      name: "b",
      type: "number",
      optional: false,
    });
  });

  it("extracts exported class with methods", async () => {
    const code = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`;

    const contract = await extract(code);

    expect(contract.exports).toHaveLength(1);
    const cls = contract.exports[0];

    expect(cls.name).toBe("Calculator");
    expect(cls.kind).toBe("class");
    expect(cls.methods).toBeDefined();
    expect(cls.methods?.length).toBeGreaterThan(0);

    const addMethod = cls.methods?.find((m) => m.name === "add");
    expect(addMethod).toBeDefined();
    expect(addMethod?.signature.params).toHaveLength(2);
    expect(addMethod?.signature.returnType).toBe("number");
    expect(addMethod?.signature.isAsync).toBe(false);
  });

  it("extracts JSDoc for exported function", async () => {
    const code = `
/**
 * Adds two numbers together
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;

    const contract = await extract(code);

    expect(contract.exports).toHaveLength(1);
    const fn = contract.exports[0];

    expect(fn.jsDoc).toContain("Adds two numbers together");
    expect(fn.jsDoc).toContain("@param a First number");
    expect(fn.jsDoc).toContain("@param b Second number");
    expect(fn.jsDoc).toContain("@returns Sum of a and b");
  });

  it("extracts imports and exports together", async () => {
    const code = `
import defaultThing, { helper as renamedHelper } from "./utils";

/**
 * Adds two numbers together
 */
export function add(a: number, b: number): number {
  return helper(a, b);
}
`;

    const contract = await extract(code);

    expect(contract.imports).toEqual(
      expect.arrayContaining([
        {
          module: "./utils",
          names: ["defaultThing"],
          isDefault: true,
        },
        {
          module: "./utils",
          names: ["renamedHelper"],
          isDefault: false,
        },
      ]),
    );

    expect(contract.exports.length).toBeGreaterThan(0);
  });
});
