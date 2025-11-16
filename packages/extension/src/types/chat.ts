export interface FileAttachment {
  path: string;
  content: string;
  language: string;
}

export type AttachedFile = FileAttachment;

export interface SelectionContext {
  file: string;
  language: string;
  startLine: number;
  endLine: number;
  code: string;
  truncated?: boolean;
}

export interface FileMention {
  path: string;
  type: 'file' | 'folder';
}

export interface WorkspaceFile {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface WorkspaceContext {
  rootPath: string;
  files: WorkspaceFile[];
  recentFiles: string[];
  totalFiles: number;
  truncated: boolean;
}

export interface MessageContext {
  files?: FileAttachment[];
  selection?: SelectionContext;
  workspace?: WorkspaceContext;
  mentions?: FileMention[];
}
