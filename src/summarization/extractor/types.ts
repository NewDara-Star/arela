export interface SemanticContract {
  filePath: string;
  description?: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  metadata: {
    language: string;
    linesOfCode: number;
    extractedAt: string;
  };
}

export type ExportKind =
  | "function"
  | "class"
  | "const"
  | "type"
  | "interface";

export interface ExportInfo {
  name: string;
  kind: ExportKind;
  jsDoc?: string;
  signature?: FunctionSignature;
  methods?: MethodInfo[];
}

export interface MethodInfo {
  name: string;
  jsDoc?: string;
  signature: FunctionSignature;
}

export interface FunctionSignature {
  params: ParamInfo[];
  returnType?: string;
  isAsync: boolean;
}

export interface ParamInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  module: string;
  names: string[];
  isDefault: boolean;
}

