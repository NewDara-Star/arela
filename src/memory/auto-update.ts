import { watch, FSWatcher } from 'chokidar';
import { existsSync } from 'fs';
import { join } from 'path';

export interface AutoUpdateOptions {
  projectPath: string;
  ignored?: string[];
  debounceMs?: number;
}

export class MemoryAutoUpdater {
  private watcher: FSWatcher | null = null;
  private updateQueue: Map<string, 'add' | 'change' | 'unlink'> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  start(options: AutoUpdateOptions) {
    const { projectPath, ignored, debounceMs = 500 } = options;
    
    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }
    
    console.log('🔄 Starting memory auto-updater...');
    
    this.watcher = watch(projectPath, {
      ignored: ignored || [
        /(node_modules|\.git|dist|build|\.arela|\.next|\.turbo|coverage)/,
        /\.(log|lock|map)$/,
        /package-lock\.json$/,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });
    
    // Queue changes for batch processing
    this.watcher.on('all', (event, path) => {
      if (event === 'add' || event === 'change' || event === 'unlink') {
        this.updateQueue.set(path, event);
        this.scheduleUpdate(debounceMs);
      }
    });
    
    this.watcher.on('error', (error) => {
      console.error('❌ File watcher error:', error);
    });
    
    console.log('✅ Memory auto-updater started');
    console.log(`   Watching: ${projectPath}`);
    console.log(`   Debounce: ${debounceMs}ms`);
  }
  
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('⏹️  Memory auto-updater stopped');
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
  
  isRunning(): boolean {
    return this.watcher !== null;
  }
  
  private scheduleUpdate(debounceMs: number) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, debounceMs);
  }
  
  private async processQueue() {
    if (this.updateQueue.size === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    const updates = Array.from(this.updateQueue.entries());
    this.updateQueue.clear();
    
    const start = Date.now();
    console.log(`📝 Processing ${updates.length} file change(s)...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [path, event] of updates) {
      try {
        if (event === 'unlink') {
          await this.removeFile(path);
        } else {
          await this.updateFile(path);
        }
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process ${path}:`, error instanceof Error ? error.message : error);
        errorCount++;
        // Continue with other files
      }
    }
    
    const duration = Date.now() - start;
    console.log(`✅ Processed ${successCount} file(s) in ${duration}ms`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} file(s) failed`);
    }
    
    this.isProcessing = false;
  }
  
  private async updateFile(path: string) {
    // TODO: Integrate with actual memory systems when they exist
    // For now, just log the update
    
    // Future integration:
    // await graphMemory.updateFile(path);
    // await vectorMemory.reindexFile(path);
    // await sessionMemory?.markFileChanged(path);
    
    console.log(`  ✓ Updated: ${path}`);
  }
  
  private async removeFile(path: string) {
    // TODO: Integrate with actual memory systems when they exist
    // For now, just log the removal
    
    // Future integration:
    // await graphMemory.removeFile(path);
    // await vectorMemory.removeFile(path);
    
    console.log(`  🗑️  Removed: ${path}`);
  }
}

// Singleton instance
export const memoryAutoUpdater = new MemoryAutoUpdater();
