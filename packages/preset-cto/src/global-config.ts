/**
 * Global Configuration System for Arela
 * 
 * Manages user-level learning data, custom rules, and preferences
 * stored in ~/.arela/ (persists across projects)
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface LearningPattern {
  id: string;
  rule: string;
  description: string;
  occurrences: number;
  projects: string[];
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  suggestedRule?: string;
}

export interface ProjectInfo {
  path: string;
  name: string;
  violations: Record<string, number>;
  lastSync: string;
  packageVersion: string;
}

export interface CustomRule {
  id: string;
  title: string;
  file: string;
  source: string;
  appliedTo: string[];
  createdAt: string;
}

export interface GlobalConfig {
  version: string;
  userId: string;
  createdAt: string;
  lastUpdated: string;
  projects: Record<string, ProjectInfo>;
  patterns: LearningPattern[];
  customRules: CustomRule[];
  preferences: {
    autoSync: boolean;
    autoApplyPatterns: boolean;
    notifyUpdates: boolean;
    learningEnabled: boolean;
  };
}

export class GlobalConfigManager {
  private globalRoot: string;
  private configPath: string;
  private customRulesPath: string;

  constructor() {
    this.globalRoot = path.join(os.homedir(), '.arela');
    this.configPath = path.join(this.globalRoot, 'config.json');
    this.customRulesPath = path.join(this.globalRoot, 'custom-rules');
  }

  /**
   * Initialize global config if it doesn't exist
   */
  async init(): Promise<void> {
    if (!await fs.pathExists(this.globalRoot)) {
      await fs.ensureDir(this.globalRoot);
      await fs.ensureDir(this.customRulesPath);
      
      const config: GlobalConfig = {
        version: '1.0.0',
        userId: this.generateUserId(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        projects: {},
        patterns: [],
        customRules: [],
        preferences: {
          autoSync: true,
          autoApplyPatterns: false,
          notifyUpdates: true,
          learningEnabled: true,
        },
      };
      
      await fs.writeJson(this.configPath, config, { spaces: 2 });
      console.log('✅ Created global learning system at ~/.arela/');
    }
  }

  /**
   * Read global config
   */
  async read(): Promise<GlobalConfig> {
    if (!await fs.pathExists(this.configPath)) {
      await this.init();
    }
    return await fs.readJson(this.configPath);
  }

  /**
   * Write global config
   */
  async write(config: GlobalConfig): Promise<void> {
    config.lastUpdated = new Date().toISOString();
    await fs.writeJson(this.configPath, config, { spaces: 2 });
  }

  /**
   * Register a project
   */
  async registerProject(projectPath: string, packageVersion: string): Promise<void> {
    const config = await this.read();
    const projectName = path.basename(projectPath);
    
    config.projects[projectPath] = {
      path: projectPath,
      name: projectName,
      violations: {},
      lastSync: new Date().toISOString(),
      packageVersion,
    };
    
    await this.write(config);
  }

  /**
   * Record a violation
   */
  async recordViolation(projectPath: string, rule: string): Promise<void> {
    const config = await this.read();
    
    // Update project violations
    if (config.projects[projectPath]) {
      const violations = config.projects[projectPath].violations;
      violations[rule] = (violations[rule] || 0) + 1;
    }
    
    // Update or create pattern
    const existingPattern = config.patterns.find(p => p.rule === rule);
    
    if (existingPattern) {
      existingPattern.occurrences++;
      existingPattern.lastSeen = new Date().toISOString();
      if (!existingPattern.projects.includes(projectPath)) {
        existingPattern.projects.push(projectPath);
      }
      existingPattern.confidence = this.calculateConfidence(existingPattern);
    } else {
      const newPattern: LearningPattern = {
        id: this.generateId(),
        rule,
        description: `Frequent violation of ${rule}`,
        occurrences: 1,
        projects: [projectPath],
        confidence: 0.1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      config.patterns.push(newPattern);
    }
    
    await this.write(config);
  }

  /**
   * Get patterns for a project
   */
  async getPatterns(projectPath: string, minConfidence = 0.7): Promise<LearningPattern[]> {
    const config = await this.read();
    
    // Get patterns from other projects with high confidence
    return config.patterns
      .filter(p => p.confidence >= minConfidence)
      .filter(p => !p.projects.includes(projectPath)) // Not from this project
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Add custom rule
   */
  async addCustomRule(rule: CustomRule): Promise<void> {
    const config = await this.read();
    
    // Check if rule already exists
    const existing = config.customRules.find(r => r.id === rule.id);
    if (existing) {
      existing.appliedTo = [...new Set([...existing.appliedTo, ...rule.appliedTo])];
    } else {
      config.customRules.push(rule);
    }
    
    await this.write(config);
  }

  /**
   * Get custom rules
   */
  async getCustomRules(): Promise<CustomRule[]> {
    const config = await this.read();
    return config.customRules;
  }

  /**
   * Save custom rule file
   */
  async saveCustomRuleFile(id: string, content: string): Promise<string> {
    const filePath = path.join(this.customRulesPath, `${id}.md`);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Get project info
   */
  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    const config = await this.read();
    return config.projects[projectPath] || null;
  }

  /**
   * Update project version
   */
  async updateProjectVersion(projectPath: string, version: string): Promise<void> {
    const config = await this.read();
    if (config.projects[projectPath]) {
      config.projects[projectPath].packageVersion = version;
      config.projects[projectPath].lastSync = new Date().toISOString();
      await this.write(config);
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<ProjectInfo[]> {
    const config = await this.read();
    return Object.values(config.projects);
  }

  /**
   * Export patterns for sharing
   */
  async exportPatterns(): Promise<string> {
    const config = await this.read();
    return JSON.stringify({
      patterns: config.patterns,
      customRules: config.customRules,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import patterns from another user/team
   */
  async importPatterns(data: string): Promise<void> {
    const imported = JSON.parse(data);
    const config = await this.read();
    
    // Merge patterns (avoid duplicates)
    for (const pattern of imported.patterns) {
      const existing = config.patterns.find(p => p.rule === pattern.rule);
      if (!existing) {
        pattern.id = this.generateId(); // New ID for imported pattern
        config.patterns.push(pattern);
      }
    }
    
    // Merge custom rules
    for (const rule of imported.customRules) {
      const existing = config.customRules.find(r => r.id === rule.id);
      if (!existing) {
        config.customRules.push(rule);
      }
    }
    
    await this.write(config);
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidence(pattern: LearningPattern): number {
    const occurrences = pattern.occurrences;
    const projectCount = pattern.projects.length;
    
    // More occurrences = higher confidence
    // More projects = higher confidence
    // Cap at 0.95
    const score = Math.min(
      0.95,
      (occurrences * 0.1) + (projectCount * 0.2)
    );
    
    return Math.round(score * 100) / 100;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get global root path
   */
  getGlobalRoot(): string {
    return this.globalRoot;
  }

  /**
   * Get custom rules path
   */
  getCustomRulesPath(): string {
    return this.customRulesPath;
  }
}

// Singleton instance
export const globalConfig = new GlobalConfigManager();
