import pc from "picocolors";

export interface ProgressOptions {
  total: number;
  label?: string;
  width?: number;
}

export class ProgressBar {
  private total: number;
  private current: number = 0;
  private label: string;
  private width: number;
  private startTime: number;
  private lastUpdate: number = 0;
  private lastUpdateTime: number;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label || "Progress";
    this.width = options.width || 40;
    this.startTime = Date.now();
    this.lastUpdateTime = Date.now();
  }
  
  /**
   * Update progress
   */
  update(current: number): void {
    this.current = current;
    
    // Throttle updates to every 100ms
    const now = Date.now();
    if (now - this.lastUpdate < 100 && current < this.total) {
      return;
    }
    this.lastUpdate = now;
    
    this.render();
  }
  
  /**
   * Increment progress by 1
   */
  increment(): void {
    this.update(this.current + 1);
  }
  
  /**
   * Complete the progress bar
   */
  complete(): void {
    this.current = this.total;
    this.render();
    process.stdout.write("\n");
  }
  
  /**
   * Render the progress bar
   */
  private render(): void {
    const percentage = Math.min(100, (this.current / this.total) * 100);
    const filled = Math.floor((this.width * this.current) / this.total);
    const empty = this.width - filled;
    
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percent = percentage.toFixed(0).padStart(3);
    const count = `${this.current}/${this.total}`;
    
    // Calculate ETA and speed
    const elapsed = Date.now() - this.startTime;
    const elapsedSeconds = elapsed / 1000;
    const rate = this.current / elapsedSeconds;
    const remaining = this.total - this.current;
    const eta = remaining / rate;
    const etaStr = this.formatTime(eta);
    
    // Calculate files/second (speed metric for ARELA-003)
    const speed = rate.toFixed(1);
    
    const line = `${this.label}: [${pc.cyan(bar)}] ${percent}% (${count}) - ETA: ${etaStr} - ${speed} files/sec`;
    
    // Clear line and write
    process.stdout.write(`\r${line}`);
  }
  
  /**
   * Format time in seconds to human readable
   */
  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return "--:--";
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}

/**
 * Create a simple spinner
 */
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private current = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;
  
  constructor(message: string) {
    this.message = message;
  }
  
  start(): void {
    this.interval = setInterval(() => {
      const frame = this.frames[this.current];
      process.stdout.write(`\r${pc.cyan(frame)} ${this.message}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
  }
  
  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write(`\r${finalMessage || this.message}\n`);
  }
  
  succeed(message?: string): void {
    this.stop(pc.green(`✓ ${message || this.message}`));
  }
  
  fail(message?: string): void {
    this.stop(pc.red(`✗ ${message || this.message}`));
  }
}
