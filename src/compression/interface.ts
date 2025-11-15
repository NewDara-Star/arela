export interface ContextCompressor {
  /**
   * Compress data to string format
   */
  compress(data: unknown): string;

  /**
   * Decompress string back to data
   */
  decompress(data: string): unknown;

  /**
   * Count tokens in compressed string
   */
  getTokenCount(data: string): number;

  /**
   * Get compressor name
   */
  getName(): string;
}

export type CompressionType = "json" | "toon";

export interface CompressionConfig {
  type: CompressionType;
  /**
   * If true, fallback to JSON on error when using non-JSON compressors
   */
  fallback?: boolean;
}

