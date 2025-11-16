export interface AttachedFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeSelection {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface FileMention {
  path: string;
  type: 'file' | 'folder';
}

export interface MessageContext {
  files?: AttachedFile[];
  selection?: CodeSelection;
  mentions?: FileMention[];
}
