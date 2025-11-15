import { createHash } from "crypto";
import type { SemanticContract } from "../extractor/types.js";

/**
 * Compute a deterministic semantic hash for a SemanticContract.
 *
 * Only public API structure and imports are included. Comments,
 * file-level descriptions, private helpers, and metadata fields
 * are intentionally ignored so that purely cosmetic changes do
 * not invalidate cached summaries.
 */
export function computeSemanticHash(contract: SemanticContract): string {
  const exports = [...contract.exports].map((exp) => ({
    name: exp.name,
    kind: exp.kind,
    signature: exp.signature
      ? {
          isAsync: exp.signature.isAsync,
          returnType: exp.signature.returnType ?? null,
          params: exp.signature.params.map((p) => ({
            name: p.name,
            type: p.type ?? null,
            optional: p.optional,
            defaultValue: p.defaultValue ?? null,
          })),
        }
      : null,
    methods: exp.methods
      ? [...exp.methods]
          .map((m) => ({
            name: m.name,
            signature: {
              isAsync: m.signature.isAsync,
              returnType: m.signature.returnType ?? null,
              params: m.signature.params.map((p) => ({
                name: p.name,
                type: p.type ?? null,
                optional: p.optional,
                defaultValue: p.defaultValue ?? null,
              })),
            },
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : null,
  }));

  // Sort exports for stability
  exports.sort((a, b) => a.name.localeCompare(b.name));

  const imports = [...contract.imports].map((imp) => ({
    module: imp.module,
    isDefault: imp.isDefault,
    names: [...imp.names].sort(),
  }));

  // Sort imports for stability
  imports.sort((a, b) => {
    if (a.module === b.module) {
      return a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1;
    }
    return a.module.localeCompare(b.module);
  });

  const semanticData = {
    exports,
    imports,
  };

  const json = JSON.stringify(semanticData);
  return createHash("sha256").update(json).digest("hex");
}

