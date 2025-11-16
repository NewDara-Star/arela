export interface ParseAstParams {
  language?: string;
  source?: string;
}

export interface ParseAstResult {
  ast: null;
  note: string;
}

export class AstParser {
  constructor() {}

  async parse(params: ParseAstParams = {}): Promise<ParseAstResult> {
    return {
      ast: null,
      note: `parseAST not implemented yet. Received params: ${JSON.stringify(params)}`,
    };
  }
}
