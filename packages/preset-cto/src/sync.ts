/**
 * Sync System for Arela
 * 
 * Handles syncing between:
 * - Package updates (node_modules)
 * - Global config (~/.arela/)
 * - Project config (.arela/)
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import pc from 'picocolors';
import prompts from 'prompts';
import { globalConfig, type LearningPattern, type CustomRule } from './global-config.js';

export interface VersionInfo {
  current: string;
  previous: string;
  hasUpdate: boolean;
}

export interface Conflict {
  rule: string;
  basePath: string;
  customPath: string;
  baseVersion: string;
  customDate: string;
}

export class SyncManager {
  private projectRoot: string;
  private packageRoot: string;
  private configPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.packageRoot = path.join(projectRoot, 'node_modules', '@newdara', 'preset-cto');
    this.configPath = path.join(projectRoot, '.arela', 'arela.config.json');
  }

  /**
   * Check if package has been updated
   */
  async checkForUpdates(): Promise<VersionInfo> {
    const currentVersion = await this.getPackageVersion();
    const previousVersion = await this.getLastKnownVersion();
    
    return {
      current: currentVersion,
      previous: previousVersion,
      hasUpdate: currentVersion !== previousVersion,
    };
  }

  /**
   * Sync after package update
   */
  async syncAfterUpdate(): Promise<void> {
    const versionInfo = await this.checkForUpdates();
    
    if (!versionInfo.hasUpdate) {
      return;
    }
    
    console.log(pc.cyan(`\n🔔 Arela updated: ${versionInfo.previous} → ${versionInfo.current}\n`));
    
    // 1. Get new rules
    const newRules = await this.getNewRules(versionInfo.previous, versionInfo.current);
    
    if (newRules.length > 0) {
      console.log(pc.yellow(`New base rules available (${newRules.length}):`));
      newRules.forEach(rule => console.log(`  - ${rule}`));
      console.log('');
      
      const { sync } = await prompts({
        type: 'confirm',
        name: 'sync',
        message: 'Sync new rules to project?',
        initial: true,
      });
      
      if (sync) {
        await this.syncNewRules(newRules);
        console.log(pc.green('✅ New rules synced'));
      }
    }
    
    // 2. Check for conflicts
    const conflicts = await this.detectConflicts();
    
    if (conflicts.length > 0) {
      console.log(pc.yellow(`\n⚠️  Conflicts detected (${conflicts.length}):`));
      await this.resolveConflicts(conflicts);
    }
    
    // 3. Show preserved data
    const customRules = await this.countCustomRules();
    console.log(pc.green('\n✅ Your custom rules preserved:'));
    console.log(`   ~/.arela/custom-rules/ (${customRules.global} rules)`);
    console.log(`   .arela/custom/ (${customRules.local} rules)`);
    
    // 4. Update version tracking
    await this.saveVersion(versionInfo.current);
    
    // 5. Update global config
    await globalConfig.updateProjectVersion(this.projectRoot, versionInfo.current);
  }

  /**
   * Sync global patterns to project
   */
  async syncGlobalPatterns(): Promise<void> {
    const patterns = await globalConfig.getPatterns(this.projectRoot);
    
    if (patterns.length === 0) {
      console.log(pc.gray('No learned patterns to apply'));
      return;
    }
    
    console.log(pc.cyan('\n🤖 Learned Patterns Available:\n'));
    console.log('From your other projects, I\'ve noticed:');
    
    patterns.forEach((pattern, i) => {
      console.log(`${i + 1}. ${pattern.description} (${pattern.occurrences} times across ${pattern.projects.length} projects)`);
    });
    
    const { apply } = await prompts({
      type: 'confirm',
      name: 'apply',
      message: 'Apply these patterns to this project?',
      initial: true,
    });
    
    if (apply) {
      await this.applyPatterns(patterns);
      console.log(pc.green(`\n✅ Applied ${patterns.length} learned patterns`));
    }
  }

  /**
   * Sync custom rules from global to project
   */
  async syncCustomRules(): Promise<void> {
    const customRules = await globalConfig.getCustomRules();
    
    if (customRules.length === 0) {
      return;
    }
    
    const customDir = path.join(this.projectRoot, '.arela', 'custom');
    await fs.ensureDir(customDir);
    
    for (const rule of customRules) {
      const sourcePath = rule.file;
      const destPath = path.join(customDir, path.basename(rule.file));
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
      }
    }
  }

  /**
   * Get new rules added in version update
   */
  private async getNewRules(oldVersion: string, newVersion: string): Promise<string[]> {
    // For now, compare all rules in package vs project
    // In future, could use git diff or changelog
    
    const packageRules = await glob('templates/.arela/rules/*.md', {
      cwd: this.packageRoot,
    });
    
    const projectRules = await glob('.arela/rules/*.md', {
      cwd: this.projectRoot,
    });
    
    const projectRuleNames = new Set(projectRules.map(r => path.basename(r)));
    const newRules = packageRules
      .map(r => path.basename(r))
      .filter(r => !projectRuleNames.has(r));
    
    return newRules;
  }

  /**
   * Sync new rules to project
   */
  private async syncNewRules(newRules: string[]): Promise<void> {
    const rulesDir = path.join(this.projectRoot, '.arela', 'rules');
    await fs.ensureDir(rulesDir);
    
    for (const rule of newRules) {
      const sourcePath = path.join(this.packageRoot, 'templates', '.arela', 'rules', rule);
      const destPath = path.join(rulesDir, rule);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
      }
    }
  }

  /**
   * Detect conflicts between base and custom rules
   */
  private async detectConflicts(): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    const customDir = path.join(this.projectRoot, '.arela', 'custom');
    if (!await fs.pathExists(customDir)) {
      return conflicts;
    }
    
    const customRules = await glob('*.md', { cwd: customDir });
    
    for (const customRule of customRules) {
      const basePath = path.join(this.projectRoot, '.arela', 'rules', customRule);
      const customPath = path.join(customDir, customRule);
      
      if (await fs.pathExists(basePath)) {
        const baseStats = await fs.stat(basePath);
        const customStats = await fs.stat(customPath);
        
        // If base is newer than custom, potential conflict
        if (baseStats.mtime > customStats.mtime) {
          conflicts.push({
            rule: customRule,
            basePath,
            customPath,
            baseVersion: await this.getPackageVersion(),
            customDate: customStats.mtime.toISOString(),
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve conflicts interactively
   */
  private async resolveConflicts(conflicts: Conflict[]): Promise<void> {
    for (const conflict of conflicts) {
      console.log(pc.yellow(`\n⚠️  Conflict: ${conflict.rule}`));
      console.log(`   Base rule updated in v${conflict.baseVersion}`);
      console.log(`   You have custom version from ${new Date(conflict.customDate).toLocaleDateString()}`);
      
      const { choice } = await prompts({
        type: 'select',
        name: 'choice',
        message: 'How to resolve?',
        choices: [
          { title: 'Keep your custom version', value: 'keep' },
          { title: 'Use new base version (backup yours)', value: 'base' },
          { title: 'View diff', value: 'diff' },
          { title: 'Skip', value: 'skip' },
        ],
      });
      
      switch (choice) {
        case 'keep':
          await this.markAsOverride(conflict.rule);
          console.log(pc.green('✅ Keeping your custom version'));
          break;
        case 'base':
          await this.backupCustomRule(conflict.customPath);
          await fs.copy(conflict.basePath, conflict.customPath);
          console.log(pc.green('✅ Using base version (custom backed up)'));
          break;
        case 'diff':
          await this.showDiff(conflict);
          // Re-prompt after showing diff
          await this.resolveConflicts([conflict]);
          break;
        case 'skip':
          console.log(pc.gray('Skipped'));
          break;
      }
    }
  }

  /**
   * Apply learned patterns to project
   */
  private async applyPatterns(patterns: LearningPattern[]): Promise<void> {
    const config = await this.readProjectConfig();
    
    if (!config.learnedPatterns) {
      config.learnedPatterns = [];
    }
    
    for (const pattern of patterns) {
      if (!config.learnedPatterns.includes(pattern.id)) {
        config.learnedPatterns.push(pattern.id);
        
        // If pattern has a suggested rule, create it
        if (pattern.suggestedRule) {
          await this.createCustomRuleFromPattern(pattern);
        }
      }
    }
    
    await this.writeProjectConfig(config);
  }

  /**
   * Create custom rule from learned pattern
   */
  private async createCustomRuleFromPattern(pattern: LearningPattern): Promise<void> {
    const customDir = path.join(this.projectRoot, '.arela', 'custom');
    await fs.ensureDir(customDir);
    
    const ruleContent = `---
id: learned.${pattern.id}
title: ${pattern.description}
category: learned
severity: should
version: 1.0.0
source: learned-pattern
---

# ${pattern.description}

**This rule was learned from your patterns across ${pattern.projects.length} projects.**

## Pattern

You've violated the "${pattern.rule}" rule ${pattern.occurrences} times.

## Suggested Action

${pattern.suggestedRule || 'Review this pattern and adjust your workflow accordingly.'}

## Confidence

${(pattern.confidence * 100).toFixed(0)}% confidence based on ${pattern.occurrences} occurrences.

## Projects

${pattern.projects.map(p => `- ${path.basename(p)}`).join('\n')}
`;
    
    const filePath = path.join(customDir, `learned-${pattern.id}.md`);
    await fs.writeFile(filePath, ruleContent, 'utf-8');
  }

  /**
   * Mark rule as override
   */
  private async markAsOverride(rule: string): Promise<void> {
    const config = await this.readProjectConfig();
    
    if (!config.overrides) {
      config.overrides = {};
    }
    
    config.overrides[`rules/${rule}`] = `custom/${rule}`;
    await this.writeProjectConfig(config);
  }

  /**
   * Backup custom rule
   */
  private async backupCustomRule(customPath: string): Promise<void> {
    const backupDir = path.join(this.projectRoot, '.arela', 'backups');
    await fs.ensureDir(backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${path.basename(customPath)}.${timestamp}.bak`);
    
    await fs.copy(customPath, backupPath);
    console.log(pc.gray(`   Backed up to: ${path.relative(this.projectRoot, backupPath)}`));
  }

  /**
   * Show diff between base and custom
   */
  private async showDiff(conflict: Conflict): Promise<void> {
    const baseContent = await fs.readFile(conflict.basePath, 'utf-8');
    const customContent = await fs.readFile(conflict.customPath, 'utf-8');
    
    console.log(pc.cyan('\n--- Base (package)'));
    console.log(pc.cyan('+++ Custom (yours)\n'));
    
    // Simple line-by-line diff
    const baseLines = baseContent.split('\n');
    const customLines = customContent.split('\n');
    const maxLines = Math.max(baseLines.length, customLines.length);
    
    for (let i = 0; i < Math.min(maxLines, 20); i++) {
      if (baseLines[i] !== customLines[i]) {
        if (baseLines[i]) console.log(pc.red(`- ${baseLines[i]}`));
        if (customLines[i]) console.log(pc.green(`+ ${customLines[i]}`));
      }
    }
    
    if (maxLines > 20) {
      console.log(pc.gray(`\n... (${maxLines - 20} more lines)`));
    }
  }

  /**
   * Count custom rules
   */
  private async countCustomRules(): Promise<{ global: number; local: number }> {
    const globalRules = await globalConfig.getCustomRules();
    
    const localCustomDir = path.join(this.projectRoot, '.arela', 'custom');
    let localCount = 0;
    
    if (await fs.pathExists(localCustomDir)) {
      const localRules = await glob('*.md', { cwd: localCustomDir });
      localCount = localRules.length;
    }
    
    return {
      global: globalRules.length,
      local: localCount,
    };
  }

  /**
   * Get package version
   */
  private async getPackageVersion(): Promise<string> {
    const pkgPath = path.join(this.packageRoot, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      return pkg.version;
    }
    return '0.0.0';
  }

  /**
   * Get last known version
   */
  private async getLastKnownVersion(): Promise<string> {
    const config = await this.readProjectConfig();
    return config.packageVersion || '0.0.0';
  }

  /**
   * Save version
   */
  private async saveVersion(version: string): Promise<void> {
    const config = await this.readProjectConfig();
    config.packageVersion = version;
    config.lastSync = new Date().toISOString();
    await this.writeProjectConfig(config);
  }

  /**
   * Read project config
   */
  private async readProjectConfig(): Promise<any> {
    if (await fs.pathExists(this.configPath)) {
      return await fs.readJson(this.configPath);
    }
    return {
      version: '1.0.0',
      packageVersion: '0.0.0',
      lastSync: new Date().toISOString(),
      customRules: [],
      overrides: {},
      learnedPatterns: [],
    };
  }

  /**
   * Write project config
   */
  private async writeProjectConfig(config: any): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, config, { spaces: 2 });
  }
}
