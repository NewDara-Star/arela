export type JsonRpcId = string | number | null;

export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: TParams;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse<TResult = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: TResult;
  error?: JsonRpcError;
}

export type JsonRpcHandler<TParams = unknown, TResult = unknown> = (
  params: TParams,
) => Promise<TResult> | TResult;

export const JSON_RPC_VERSION = '2.0' as const;

export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InternalError = -32603,
}
