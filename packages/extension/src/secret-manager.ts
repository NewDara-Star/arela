import * as vscode from 'vscode';

export type ApiProvider = 'openai' | 'anthropic';

const SECRET_KEYS: Record<ApiProvider, string> = {
  openai: 'arela.openai.apiKey',
  anthropic: 'arela.anthropic.apiKey',
};

export class SecretManager {
  constructor(private readonly storage: vscode.SecretStorage) {}

  async setApiKey(provider: ApiProvider, key: string) {
    await this.storage.store(SECRET_KEYS[provider], key);
  }

  async getApiKey(provider: ApiProvider) {
    return this.storage.get(SECRET_KEYS[provider]);
  }

  async deleteApiKey(provider: ApiProvider) {
    await this.storage.delete(SECRET_KEYS[provider]);
  }

  async hasApiKey(provider: ApiProvider) {
    const existing = await this.storage.get(SECRET_KEYS[provider]);
    return Boolean(existing);
  }
}
