import Database from 'better-sqlite3';
import Parser from 'tree-sitter';

export interface ServerOptions {
  dbPath: string;
}

export class ArelaServer {
  private readonly db: Database.Database;
  private readonly parser: Parser;

  constructor(options: ServerOptions) {
    this.db = new Database(options.dbPath);
    this.parser = new Parser();
  }

  start() {
    // Placeholder: hydrate IPC + AI subsystems in later tickets.
    console.log('Arela server booted using DB at', this.db.name);
  }
}

export function createServer(options: ServerOptions) {
  const server = new ArelaServer(options);
  server.start();
  return server;
}
