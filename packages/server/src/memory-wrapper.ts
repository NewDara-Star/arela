export interface MemoryQueryParams {
  query?: string;
}

export interface MemoryQueryResult {
  items: Array<Record<string, unknown>>;
  note: string;
}

export class MemoryWrapper {
  // Placeholder: initialize connections/resources when HexiMemory integration lands.
  constructor() {}

  async query(params: MemoryQueryParams = {}): Promise<MemoryQueryResult> {
    return {
      items: [],
      note: `queryMemory not implemented yet. Received params: ${JSON.stringify(params)}`,
    };
  }

  close() {
    // Cleanup resources once they exist
  }
}
