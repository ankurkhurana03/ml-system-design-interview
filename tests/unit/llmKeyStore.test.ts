import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to mock localStorage and sessionStorage
const localStorageMap = new Map<string, string>();
const sessionStorageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => localStorageMap.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageMap.delete(key)),
  clear: vi.fn(() => localStorageMap.clear()),
  length: 0,
  key: vi.fn(() => null),
};

const mockSessionStorage = {
  getItem: vi.fn((key: string) => sessionStorageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => sessionStorageMap.set(key, value)),
  removeItem: vi.fn((key: string) => sessionStorageMap.delete(key)),
  clear: vi.fn(() => sessionStorageMap.clear()),
  length: 0,
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: mockSessionStorage, writable: true });

// Import after mocking storage
import {
  getAllProviders,
  getEnabledProviders,
  getPrimaryProvider,
  addProvider,
  removeProvider,
  updateProvider,
  saveProviders,
  getProviderApiKey,
  saveProviderApiKey,
  isProviderKeyRemembered,
  isEnsembleEnabled,
  setEnsembleEnabled,
  getLLMSettings,
  saveLLMSettings,
  isKeyRemembered,
  clearAllLLMSettings,
  PROVIDER_PRESETS,
} from '@/utils/llmKeyStore';

describe('llmKeyStore — Multi-Provider', () => {
  beforeEach(() => {
    localStorageMap.clear();
    sessionStorageMap.clear();
    vi.clearAllMocks();
  });

  describe('getAllProviders', () => {
    it('returns empty array when no data exists and no legacy settings', () => {
      const providers = getAllProviders();
      expect(providers).toEqual([]);
    });

    it('migrates legacy single-provider format', () => {
      // Set up legacy format
      localStorageMap.set('llm_key_remembered', 'true');
      localStorageMap.set('llm_api_key', 'sk-test-123');
      localStorageMap.set('llm_settings_nonsecret', JSON.stringify({
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      }));

      const providers = getAllProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].preset).toBe('openai');
      expect(providers[0].isPrimary).toBe(true);
      expect(providers[0].enabled).toBe(true);
    });

    it('detects perplexity preset from URL', () => {
      localStorageMap.set('llm_key_remembered', 'true');
      localStorageMap.set('llm_api_key', 'pplx-test');
      localStorageMap.set('llm_settings_nonsecret', JSON.stringify({
        baseUrl: 'https://api.perplexity.ai',
        model: 'sonar-pro',
      }));

      const providers = getAllProviders();
      expect(providers[0].preset).toBe('perplexity');
      expect(providers[0].name).toBe('Perplexity');
    });
  });

  describe('addProvider / removeProvider', () => {
    it('adds a provider with preset defaults', () => {
      const id = addProvider('openai');
      const providers = getAllProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].id).toBe(id);
      expect(providers[0].name).toBe('OpenAI');
      expect(providers[0].baseUrl).toBe('https://api.openai.com/v1');
      expect(providers[0].model).toBe('gpt-4o');
      expect(providers[0].isPrimary).toBe(true); // first provider is primary
    });

    it('second provider is not primary', () => {
      addProvider('openai');
      addProvider('perplexity');
      const providers = getAllProviders();
      expect(providers.length).toBe(2);
      const primaryCount = providers.filter(p => p.isPrimary).length;
      expect(primaryCount).toBe(1);
      expect(providers[0].isPrimary).toBe(true);
      expect(providers[1].isPrimary).toBe(false);
    });

    it('removes a provider and promotes new primary', () => {
      const id1 = addProvider('openai');
      const id2 = addProvider('perplexity');
      removeProvider(id1);
      const providers = getAllProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].id).toBe(id2);
      expect(providers[0].isPrimary).toBe(true);
    });
  });

  describe('updateProvider', () => {
    it('updates config fields', () => {
      const id = addProvider('custom');
      updateProvider(id, { baseUrl: 'https://my-server.com/v1', model: 'my-model' });
      const providers = getAllProviders();
      expect(providers[0].baseUrl).toBe('https://my-server.com/v1');
      expect(providers[0].model).toBe('my-model');
    });

    it('sets primary flag exclusively', () => {
      const id1 = addProvider('openai');
      const id2 = addProvider('perplexity');
      expect(getAllProviders().find(p => p.id === id1)?.isPrimary).toBe(true);
      updateProvider(id2, { isPrimary: true });
      const providers = getAllProviders();
      expect(providers.find(p => p.id === id1)?.isPrimary).toBe(false);
      expect(providers.find(p => p.id === id2)?.isPrimary).toBe(true);
    });
  });

  describe('API key storage', () => {
    it('stores key in sessionStorage by default', () => {
      const id = addProvider('openai');
      saveProviderApiKey(id, 'sk-test', false);
      expect(getProviderApiKey(id)).toBe('sk-test');
      expect(isProviderKeyRemembered(id)).toBe(false);
    });

    it('stores key in localStorage when remembered', () => {
      const id = addProvider('openai');
      saveProviderApiKey(id, 'sk-test', true);
      expect(getProviderApiKey(id)).toBe('sk-test');
      expect(isProviderKeyRemembered(id)).toBe(true);
    });
  });

  describe('getEnabledProviders', () => {
    it('filters out disabled providers', () => {
      const id1 = addProvider('openai');
      const id2 = addProvider('perplexity');
      updateProvider(id2, { enabled: false });
      const enabled = getEnabledProviders();
      expect(enabled.length).toBe(1);
      expect(enabled[0].id).toBe(id1);
    });
  });

  describe('getPrimaryProvider', () => {
    it('returns primary with API key', () => {
      const id = addProvider('openai');
      saveProviderApiKey(id, 'sk-test', false);
      const primary = getPrimaryProvider();
      expect(primary).not.toBeNull();
      expect(primary?.apiKey).toBe('sk-test');
    });

    it('returns null when no key and not ollama', () => {
      addProvider('openai');
      const primary = getPrimaryProvider();
      expect(primary).toBeNull();
    });

    it('returns ollama without key', () => {
      addProvider('ollama');
      const primary = getPrimaryProvider();
      expect(primary).not.toBeNull();
      expect(primary?.preset).toBe('ollama');
    });
  });

  describe('ensemble mode', () => {
    it('defaults to disabled', () => {
      expect(isEnsembleEnabled()).toBe(false);
    });

    it('can be toggled', () => {
      setEnsembleEnabled(true);
      expect(isEnsembleEnabled()).toBe(true);
      setEnsembleEnabled(false);
      expect(isEnsembleEnabled()).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('getLLMSettings returns primary provider settings', () => {
      const id = addProvider('openai');
      saveProviderApiKey(id, 'sk-compat', false);
      const settings = getLLMSettings();
      expect(settings).not.toBeNull();
      expect(settings?.apiKey).toBe('sk-compat');
      expect(settings?.baseUrl).toBe('https://api.openai.com/v1');
      expect(settings?.model).toBe('gpt-4o');
    });

    it('saveLLMSettings creates a provider if none exists', () => {
      saveLLMSettings({
        apiKey: 'sk-new',
        baseUrl: 'https://api.perplexity.ai',
        model: 'sonar-pro',
      }, true);
      const settings = getLLMSettings();
      expect(settings?.apiKey).toBe('sk-new');
      expect(settings?.baseUrl).toBe('https://api.perplexity.ai');
    });

    it('isKeyRemembered works with multi-provider', () => {
      const id = addProvider('openai');
      saveProviderApiKey(id, 'sk-test', true);
      expect(isKeyRemembered()).toBe(true);
    });
  });

  describe('clearAllLLMSettings', () => {
    it('clears everything', () => {
      addProvider('openai');
      addProvider('perplexity');
      setEnsembleEnabled(true);
      clearAllLLMSettings();
      expect(getAllProviders()).toEqual([]);
      expect(isEnsembleEnabled()).toBe(false);
    });
  });

  describe('PROVIDER_PRESETS', () => {
    it('has all expected presets', () => {
      expect(Object.keys(PROVIDER_PRESETS)).toEqual(['openai', 'perplexity', 'ollama', 'custom']);
    });

    it('openai preset has correct defaults', () => {
      expect(PROVIDER_PRESETS.openai).toEqual({
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
    });

    it('perplexity preset has correct defaults', () => {
      expect(PROVIDER_PRESETS.perplexity.baseUrl).toBe('https://api.perplexity.ai');
      expect(PROVIDER_PRESETS.perplexity.model).toBe('sonar-pro');
    });

    it('ollama preset has correct defaults', () => {
      expect(PROVIDER_PRESETS.ollama.baseUrl).toBe('http://localhost:11434/v1');
    });
  });
});
