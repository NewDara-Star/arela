/**
 * API Key Helper - User-friendly guidance for API key setup
 */

import chalk from 'chalk';

export interface APIKeyStatus {
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
  hasAnyKey: boolean;
  recommendedAction: string;
}

/**
 * Check API key status
 */
export function checkAPIKeys(): APIKeyStatus {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnyKey = hasAnthropicKey || hasOpenAIKey;

  let recommendedAction = '';
  if (!hasAnyKey) {
    recommendedAction = 'setup-keys';
  } else if (!hasAnthropicKey && hasOpenAIKey) {
    recommendedAction = 'consider-claude';
  } else {
    recommendedAction = 'all-good';
  }

  return {
    hasAnthropicKey,
    hasOpenAIKey,
    hasAnyKey,
    recommendedAction,
  };
}

/**
 * Show friendly API key setup guide
 */
export function showAPIKeyGuide(context: 'first-run' | 'error' | 'suggestion' = 'first-run'): void {
  const status = checkAPIKeys();

  if (context === 'first-run' && !status.hasAnyKey) {
    console.log(chalk.cyan('\n🔑 Welcome to Arela!\n'));
    console.log('To get started, you need to set up API keys for AI models.\n');
    
    console.log(chalk.bold('📋 You have 3 options:\n'));
    
    console.log(chalk.green('1. Claude API (Recommended) ☁️'));
    console.log('   • Best code understanding');
    console.log('   • ~$0.0001 per file (~$1/month typical use)');
    console.log('   • Get key: https://console.anthropic.com/');
    console.log('   • Add to .env: ANTHROPIC_API_KEY=sk-ant-...\n');
    
    console.log(chalk.blue('2. OpenAI API (Alternative) ☁️'));
    console.log('   • Fast and reliable');
    console.log('   • ~$0.0001 per file (~$1/month typical use)');
    console.log('   • Get key: https://platform.openai.com/');
    console.log('   • Add to .env: OPENAI_API_KEY=sk-...\n');
    
    console.log(chalk.yellow('3. Ollama (Free, Local) 🏠'));
    console.log('   • Completely free');
    console.log('   • Runs on your machine');
    console.log('   • Install: https://ollama.ai/');
    console.log('   • Use: arela summarize --local\n');
    
    console.log(chalk.dim('💡 Tip: Most users spend less than $1/month on API costs!\n'));
    console.log(chalk.dim('📖 Full guide: docs/API_KEYS_GUIDE.md\n'));
  }

  if (context === 'error' && !status.hasAnyKey) {
    console.log(chalk.red('\n❌ No API key found!\n'));
    console.log('Arela needs an API key to use cloud AI models.\n');
    
    console.log(chalk.bold('Quick setup:\n'));
    console.log('1. Get API key:');
    console.log('   • Claude: https://console.anthropic.com/');
    console.log('   • OpenAI: https://platform.openai.com/\n');
    console.log('2. Add to .env file:');
    console.log(chalk.cyan('   echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env\n'));
    console.log('3. Try again!\n');
    
    console.log(chalk.yellow('Or use free local model:'));
    console.log(chalk.cyan('   arela summarize --local\n'));
    
    console.log(chalk.dim('📖 Full guide: docs/API_KEYS_GUIDE.md\n'));
  }

  if (context === 'suggestion' && status.hasOpenAIKey && !status.hasAnthropicKey) {
    console.log(chalk.cyan('\n💡 Tip: Consider adding Claude API!\n'));
    console.log('Claude often provides better code understanding than OpenAI.');
    console.log('Get key: https://console.anthropic.com/');
    console.log('Add to .env: ANTHROPIC_API_KEY=sk-ant-...\n');
  }
}

/**
 * Show cost information
 */
export function showCostInfo(): void {
  console.log(chalk.cyan('\n💰 API Cost Information\n'));
  
  console.log(chalk.bold('Typical Costs:\n'));
  console.log('• Per file summarization: ~$0.0001');
  console.log('• Small project (100 files): ~$0.10');
  console.log('• Medium project (1000 files): ~$1.00');
  console.log('• Large project (10000 files): ~$10.00\n');
  
  console.log(chalk.green('With 70% cache hit rate: ~70% savings! 🎉\n'));
  
  console.log(chalk.dim('💡 Track your usage: arela summarize:stats\n'));
}

/**
 * Show subscription clarification
 */
export function showSubscriptionClarification(): void {
  console.log(chalk.yellow('\n❓ Can I use my ChatGPT Plus / Claude Pro subscription?\n'));
  
  console.log(chalk.red('Unfortunately, no.\n'));
  
  console.log('Chat subscriptions are separate from API access:\n');
  console.log('• ChatGPT Plus / Claude Pro = Web chat interface');
  console.log('• API Access = Programmatic calls (what Arela needs)\n');
  
  console.log(chalk.green('Good news: API is actually cheaper for Arela!\n'));
  console.log('• ChatGPT Plus: $20/month (can\'t use with Arela)');
  console.log('• API: ~$1/month for typical use');
  console.log('• Ollama: $0 (free, local)\n');
  
  console.log(chalk.dim('📖 Learn more: docs/API_KEYS_GUIDE.md\n'));
}

/**
 * Validate API key format
 */
export function validateAPIKey(key: string, provider: 'anthropic' | 'openai'): {
  valid: boolean;
  error?: string;
} {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key is empty' };
  }

  if (provider === 'anthropic') {
    if (!key.startsWith('sk-ant-')) {
      return {
        valid: false,
        error: 'Anthropic API keys should start with "sk-ant-"',
      };
    }
  }

  if (provider === 'openai') {
    if (!key.startsWith('sk-')) {
      return {
        valid: false,
        error: 'OpenAI API keys should start with "sk-"',
      };
    }
  }

  if (key.length < 20) {
    return {
      valid: false,
      error: 'API key seems too short. Please check and try again.',
    };
  }

  return { valid: true };
}

/**
 * Show API key validation error
 */
export function showValidationError(provider: 'anthropic' | 'openai', error: string): void {
  console.log(chalk.red(`\n❌ Invalid ${provider === 'anthropic' ? 'Claude' : 'OpenAI'} API key\n`));
  console.log(chalk.yellow(`Error: ${error}\n`));
  
  console.log('Please check:');
  console.log('1. Key format is correct');
  console.log('2. Key is active in console');
  console.log('3. No extra spaces or quotes\n');
  
  const consoleUrl = provider === 'anthropic' 
    ? 'https://console.anthropic.com/'
    : 'https://platform.openai.com/';
  
  console.log(`Get a new key: ${consoleUrl}\n`);
}

/**
 * Interactive API key setup (for future use)
 */
export async function interactiveSetup(): Promise<void> {
  console.log(chalk.cyan('\n🚀 Let\'s set up your API keys!\n'));
  
  // This would use inquirer or prompts for interactive CLI
  // For now, just show instructions
  
  console.log('Follow these steps:\n');
  console.log('1. Choose your provider:');
  console.log('   a) Claude (recommended)');
  console.log('   b) OpenAI');
  console.log('   c) Both (best experience)');
  console.log('   d) Ollama (free, local)\n');
  
  console.log('2. Get your API key:');
  console.log('   • Claude: https://console.anthropic.com/');
  console.log('   • OpenAI: https://platform.openai.com/\n');
  
  console.log('3. Add to .env file:');
  console.log(chalk.cyan('   echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env\n'));
  
  console.log('4. Test it:');
  console.log(chalk.cyan('   arela summarize src/index.ts\n'));
  
  console.log(chalk.green('You\'re all set! 🎉\n'));
}
