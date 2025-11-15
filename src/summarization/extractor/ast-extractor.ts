import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";

import {
  type ExportInfo,
  type FunctionSignature,
  type ImportInfo,
  type MethodInfo,
  type ParamInfo,
  type SemanticContract,
} from "./types.js";

const TS_LANGUAGE = TypeScript.typescript;

export class ASTExtractor {
  private readonly parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TS_LANGUAGE);
  }

  /**
   * Extract semantic contract from code
   */
  async extract(code: string, filePath: string): Promise<SemanticContract> {
    // Parse with tree-sitter for future, richer AST-based analysis.
    // Current implementation primarily uses lightweight textual parsing
    // to keep logic robust without deep grammar coupling.
    this.parser.parse(code);

    const lines = code.split(/\r?\n/);
    const lineOffsets = this.computeLineOffsets(lines);

    const exports = this.extractExports(code, lines, lineOffsets);
    const imports = this.extractImports(code);

    return {
      filePath,
      description: this.extractFileDescription(lines),
      exports,
      imports,
      metadata: {
        language: this.detectLanguage(filePath),
        linesOfCode: lines.length,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private detectLanguage(filePath: string): string {
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      return "typescript";
    }

    if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
      return "javascript";
    }

    return "typescript";
  }

  private computeLineOffsets(lines: string[]): number[] {
    const offsets: number[] = [];
    let current = 0;
    for (const line of lines) {
      offsets.push(current);
      current += line.length + 1; // assume \n
    }
    return offsets;
  }

  private indexToLine(index: number, lineOffsets: number[]): number {
    // Binary search for the greatest offset <= index
    let low = 0;
    let high = lineOffsets.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const offset = lineOffsets[mid];
      if (offset === index) return mid;
      if (offset < index) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(0, high);
  }

  private extractFileDescription(lines: string[]): string | undefined {
    // Look for a leading file-level JSDoc before any non-comment, non-empty line.
    let firstCodeLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("/*")) {
        // Might be JSDoc; handled below.
        firstCodeLine = i;
        break;
      }
      firstCodeLine = i;
      break;
    }

    if (firstCodeLine === 0) return undefined;

    return this.extractJsDocForLine(firstCodeLine, lines);
  }

  private extractExports(
    code: string,
    lines: string[],
    lineOffsets: number[],
  ): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const exportRegex =
      /^export\s+(default\s+)?(async\s+)?(function|class|const|let|var|type|interface)\s+([A-Za-z0-9_$]*)/gm;

    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(code)) !== null) {
      const [full, defaultKeyword, asyncKeyword, kindToken, nameRaw] = match;
      const startIndex = match.index;
      const startLine = this.indexToLine(startIndex, lineOffsets);
      const jsDoc = this.extractJsDocForLine(startLine, lines);

      const isAsync = Boolean(asyncKeyword);
      const name = nameRaw || "default";

      if (kindToken === "function") {
        const signature = this.extractFunctionSignatureFromText(
          code.slice(startIndex + full.length),
          isAsync,
        );
        exports.push({
          name,
          kind: "function",
          jsDoc,
          signature,
        });
      } else if (kindToken === "class") {
        const classBodyText = this.extractBlockText(
          code,
          startIndex + full.length,
        );
        const methods = this.extractMethodsFromClassBody(classBodyText, lines);
        exports.push({
          name,
          kind: "class",
          jsDoc,
          methods,
        });
      } else if (kindToken === "type") {
        exports.push({
          name,
          kind: "type",
          jsDoc,
        });
      } else if (kindToken === "interface") {
        exports.push({
          name,
          kind: "interface",
          jsDoc,
        });
      } else {
        // const / let / var
        const signature = this.extractArrowFunctionSignatureFromExport(
          code,
          match.index,
        );
        exports.push({
          name,
          kind: "const",
          jsDoc,
          signature,
        });
      }
    }

    // Handle named exports: export { foo, bar as baz }
    const namedExportRegex =
      /^export\s*\{([^}]+)\}(?:\s*from\s*["'][^"']+["'])?/gm;
    while ((match = namedExportRegex.exec(code)) !== null) {
      const namesPart = match[1];
      const startIndex = match.index;
      const startLine = this.indexToLine(startIndex, lineOffsets);
      const jsDoc = this.extractJsDocForLine(startLine, lines);

      const specs = namesPart.split(",").map((part) => part.trim());
      for (const spec of specs) {
        if (!spec) continue;
        const pieces = spec.split(/\s+as\s+/i);
        const exportedName = (pieces[1] || pieces[0]).trim();
        exports.push({
          name: exportedName,
          kind: "const",
          jsDoc,
        });
      }
    }

    // Handle export * from './mod'
    const starExportRegex = /^export\s+\*\s+from\s+["']([^"']+)["']/gm;
    while ((match = starExportRegex.exec(code)) !== null) {
      exports.push({
        name: "*",
        kind: "const",
      });
    }

    return exports;
  }

  private extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // import ... from 'module';
    const importFromRegex =
      /^import\s+([^'";]+?)\s+from\s+["']([^"']+)["'];?/gm;
    let match: RegExpExecArray | null;

    while ((match = importFromRegex.exec(code)) !== null) {
      const bindings = match[1].trim();
      const module = match[2].trim();

      const cleaned = bindings.replace(/^type\s+/, "").trim();

      // default + named: defaultName, { a, b as c }
      let defaultPart: string | undefined;
      let namedPart: string | undefined;

      if (cleaned.includes(",")) {
        const [first, rest] = cleaned.split(",", 2);
        defaultPart = first.trim();
        namedPart = rest.trim();
      } else if (cleaned.startsWith("{") || cleaned.startsWith("*")) {
        namedPart = cleaned;
      } else if (cleaned) {
        defaultPart = cleaned;
      }

      if (defaultPart) {
        imports.push({
          module,
          names: [defaultPart],
          isDefault: true,
        });
      }

      if (namedPart) {
        if (namedPart.startsWith("{")) {
          const inner = namedPart.slice(1, -1);
          const specs = inner.split(",").map((p) => p.trim());
          const names: string[] = [];
          for (const spec of specs) {
            if (!spec) continue;
            const pieces = spec.split(/\s+as\s+/i);
            const localName = (pieces[1] || pieces[0]).trim();
            names.push(localName);
          }
          if (names.length > 0) {
            imports.push({
              module,
              names,
              isDefault: false,
            });
          }
        } else if (namedPart.startsWith("*")) {
          imports.push({
            module,
            names: [namedPart],
            isDefault: false,
          });
        }
      }
    }

    // import 'side-effect';
    const sideEffectRegex = /^import\s+["']([^"']+)["'];?/gm;
    while ((match = sideEffectRegex.exec(code)) !== null) {
      const module = match[1].trim();
      imports.push({
        module,
        names: [],
        isDefault: false,
      });
    }

    return imports;
  }

  private extractJsDocForLine(
    lineIndex: number,
    lines: string[],
  ): string | undefined {
    let i = lineIndex - 1;
    if (i < 0) return undefined;

    // Skip empty lines immediately above
    while (i >= 0 && !lines[i].trim()) {
      i--;
    }

    if (i < 0) return undefined;

    const current = lines[i].trim();
    // Check if this line ends the JSDoc comment
    if (!current.endsWith("*/")) return undefined;
    
    // Find the start of the JSDoc comment
    let startLine = i;
    while (startLine >= 0 && !lines[startLine].trim().startsWith("/**")) {
      startLine--;
    }
    
    if (startLine < 0) return undefined;

    const commentLines: string[] = [];
    
    // Collect all lines from start to end of JSDoc
    for (let j = startLine; j <= i; j++) {
      commentLines.push(lines[j]);
    }

    if (commentLines.length === 0) return undefined;

    const cleaned: string[] = [];
    for (const raw of commentLines) {
      let line = raw.trim();
      if (line.startsWith("/**")) {
        line = line.slice(3);
      } else if (line.startsWith("*/")) {
        line = line.slice(2);
      } else if (line.startsWith("*")) {
        line = line.slice(1);
      }
      const trimmed = line.trim();
      if (trimmed) cleaned.push(trimmed);
    }

    if (cleaned.length === 0) return undefined;
    return cleaned.join("\n");
  }

  private extractFunctionSignatureFromText(
    text: string,
    isAsync: boolean,
  ): FunctionSignature {
    const firstBrace = text.indexOf("{");
    const firstArrow = text.indexOf("=>");
    let endOfSignature = text.length;

    if (firstArrow !== -1) {
      endOfSignature = firstArrow;
    }
    if (firstBrace !== -1 && firstBrace < endOfSignature) {
      endOfSignature = firstBrace;
    }

    const sigText = text.slice(0, endOfSignature);
    const openParen = sigText.indexOf("(");
    const closeParen = openParen !== -1 ? this.findMatchingParen(sigText, openParen) : -1;

    let params: ParamInfo[] = [];
    if (openParen !== -1 && closeParen !== -1) {
      const inner = sigText.slice(openParen + 1, closeParen).trim();
      params = this.parseParams(inner);
    }

    let returnType: string | undefined;
    const rest = sigText.slice(closeParen + 1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      let rt = rest.slice(colonIndex + 1).trim();
      const braceIdx = rt.indexOf("{");
      const arrowIdx = rt.indexOf("=>");
      let cut = rt.length;
      if (braceIdx !== -1 && braceIdx < cut) cut = braceIdx;
      if (arrowIdx !== -1 && arrowIdx < cut) cut = arrowIdx;
      rt = rt.slice(0, cut).trim();
      if (rt) returnType = rt;
    }

    return {
      params,
      returnType,
      isAsync,
    };
  }

  private extractArrowFunctionSignatureFromExport(
    code: string,
    exportIndex: number,
  ): FunctionSignature | undefined {
    const afterExport = code.slice(exportIndex);
    const arrowIndex = afterExport.indexOf("=>");
    if (arrowIndex === -1) return undefined;

    const beforeArrow = afterExport.slice(0, arrowIndex + 2);
    const openParen = beforeArrow.indexOf("(");
    if (openParen === -1) {
      // Single parameter without parentheses
      const nameMatch = beforeArrow.match(/=\s*([A-Za-z0-9_$]+)/);
      if (!nameMatch) {
        return {
          params: [],
          isAsync: beforeArrow.includes("async"),
        };
      }
      const name = nameMatch[1];
      const param: ParamInfo = {
        name,
        optional: false,
      };
      return {
        params: [param],
        isAsync: beforeArrow.includes("async"),
      };
    }

    const closeParen = this.findMatchingParen(beforeArrow, openParen);
    if (closeParen === -1) return undefined;

    const inner = beforeArrow.slice(openParen + 1, closeParen).trim();
    const params = this.parseParams(inner);

    const rest = beforeArrow.slice(closeParen + 1);
    let returnType: string | undefined;
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      let rt = rest.slice(colonIndex + 1).trim();
      const arrowIdx = rt.indexOf("=>");
      if (arrowIdx !== -1) {
        rt = rt.slice(0, arrowIdx).trim();
      }
      if (rt) returnType = rt;
    }

    return {
      params,
      returnType,
      isAsync: beforeArrow.includes("async"),
    };
  }

  private findMatchingParen(text: string, startIndex: number): number {
    let depth = 0;
    for (let i = startIndex; i < text.length; i++) {
      const ch = text[i];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  private parseParams(text: string): ParamInfo[] {
    if (!text.trim()) return [];

    const params: ParamInfo[] = [];
    const parts = this.splitTopLevel(text, ",");

    for (const part of parts) {
      const raw = part.trim();
      if (!raw) continue;

      let nameAndRest = raw;
      let defaultValue: string | undefined;

      const eqIndex = raw.indexOf("=");
      if (eqIndex !== -1) {
        nameAndRest = raw.slice(0, eqIndex).trim();
        defaultValue = raw.slice(eqIndex + 1).trim();
      }

      let namePart = nameAndRest;
      let typePart: string | undefined;
      const colonIndex = nameAndRest.indexOf(":");
      if (colonIndex !== -1) {
        namePart = nameAndRest.slice(0, colonIndex).trim();
        typePart = nameAndRest.slice(colonIndex + 1).trim();
      }

      let name = namePart.trim();
      const isRest = name.startsWith("...");
      if (isRest) {
        name = name.slice(3).trim();
      }

      let optional = false;
      if (name.endsWith("?")) {
        optional = true;
        name = name.slice(0, -1);
      }

      const param: ParamInfo = {
        name,
        type: typePart,
        optional,
        defaultValue,
      };

      params.push(param);
    }

    return params;
  }

  private splitTopLevel(text: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let depthParen = 0;
    let depthAngle = 0;
    let depthBracket = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "(") depthParen++;
      else if (ch === ")") depthParen--;
      else if (ch === "<") depthAngle++;
      else if (ch === ">") depthAngle--;
      else if (ch === "[") depthBracket++;
      else if (ch === "]") depthBracket--;

      if (
        ch === delimiter &&
        depthParen === 0 &&
        depthAngle === 0 &&
        depthBracket === 0
      ) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }

    if (current) result.push(current);
    return result;
  }

  private extractBlockText(code: string, startIndex: number): string {
    const braceIndex = code.indexOf("{", startIndex);
    if (braceIndex === -1) return "";

    let depth = 0;
    for (let i = braceIndex; i < code.length; i++) {
      const ch = code[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return code.slice(braceIndex, i + 1);
        }
      }
    }
    return code.slice(braceIndex);
  }

  private extractMethodsFromClassBody(
    classBodyText: string,
    lines: string[],
  ): MethodInfo[] {
    const methods: MethodInfo[] = [];
    if (!classBodyText) return methods;

    // Roughly match method declarations: name(...) { ... }
    const methodRegex =
      /(\w+)\s*\([^)]*\)\s*:\s*[^({]+(?=\{)|(\w+)\s*\([^)]*\)\s*(?=\{)/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(classBodyText)) !== null) {
      const name = (match[1] || match[2] || "").trim();
      if (!name) continue;

      const before = classBodyText.slice(0, match.index);
      const lineIndex = before.split(/\r?\n/).length - 1;
      const jsDoc = this.extractJsDocForLine(lineIndex, lines);

      const sig = this.extractFunctionSignatureFromText(
        classBodyText.slice(match.index),
        false,
      );

      methods.push({
        name,
        jsDoc,
        signature: sig,
      });
    }

    return methods;
  }
}

