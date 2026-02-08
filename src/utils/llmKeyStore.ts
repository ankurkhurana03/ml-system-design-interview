/**
 * Secure client-side storage for LLM API credentials.
 *
 * Design principles:
 * - API key NEVER touches the server/database
 * - Default: sessionStorage (cleared when tab closes)
 * - Opt-in: localStorage via "remember key" toggle (persists across sessions)
 * - Non-sensitive settings (baseUrl, model) always use localStorage
 * - Supports multiple providers with preset configurations
 */

// --- Legacy keys (single-provider format) ---
const SESSION_KEY = 'llm_api_key';
const REMEMBER_FLAG = 'llm_key_remembered';
const SETTINGS_KEY = 'llm_settings_nonsecret';

// --- Multi-provider keys ---
const PROVIDERS_KEY = 'llm_providers';
const PROVIDER_KEYS_SESSION = 'llm_provider_keys_session';
const PROVIDER_KEYS_LOCAL = 'llm_provider_keys_local';
const PROVIDER_KEYS_REMEMBERED = 'llm_provider_keys_remembered';
const ENSEMBLE_KEY = 'llm_ensemble_enabled';

export interface LLMSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type ProviderPreset = 'openai' | 'perplexity' | 'ollama' | 'custom';

export interface ProviderConfig {
  id: string;
  name: string;
  preset: ProviderPreset;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isPrimary: boolean;
}

export interface PresetDefaults {
  name: string;
  baseUrl: string;
  model: string;
}

export const PROVIDER_PRESETS: Record<ProviderPreset, PresetDefaults> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    model: 'sonar-pro',
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen3:8b',
  },
  custom: {
    name: 'Custom',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
};

// --- ID generation ---
let idCounter = 0;
function generateId(): string {
  return `provider_${Date.now()}_${++idCounter}`;
}

// --- Provider key storage ---

function getProviderKeysRemembered(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PROVIDER_KEYS_REMEMBERED);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setProviderKeyRemembered(id: string, remembered: boolean): void {
  const map = getProviderKeysRemembered();
  map[id] = remembered;
  localStorage.setItem(PROVIDER_KEYS_REMEMBERED, JSON.stringify(map));
}

function getProviderKey(id: string): string {
  const remembered = getProviderKeysRemembered();
  if (remembered[id]) {
    return localStorage.getItem(`${PROVIDER_KEYS_LOCAL}_${id}`) || '';
  }
  return sessionStorage.getItem(`${PROVIDER_KEYS_SESSION}_${id}`) || '';
}

function setProviderKey(id: string, key: string, remember: boolean): void {
  setProviderKeyRemembered(id, remember);
  if (remember) {
    localStorage.setItem(`${PROVIDER_KEYS_LOCAL}_${id}`, key);
    sessionStorage.removeItem(`${PROVIDER_KEYS_SESSION}_${id}`);
  } else {
    sessionStorage.setItem(`${PROVIDER_KEYS_SESSION}_${id}`, key);
    localStorage.removeItem(`${PROVIDER_KEYS_LOCAL}_${id}`);
  }
}

function clearProviderKey(id: string): void {
  sessionStorage.removeItem(`${PROVIDER_KEYS_SESSION}_${id}`);
  localStorage.removeItem(`${PROVIDER_KEYS_LOCAL}_${id}`);
  const map = getProviderKeysRemembered();
  delete map[id];
  localStorage.setItem(PROVIDER_KEYS_REMEMBERED, JSON.stringify(map));
}

// --- Provider config storage (without keys) ---

function loadProviderConfigs(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted data
  }
  return [];
}

function saveProviderConfigs(providers: ProviderConfig[]): void {
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
}

// --- Migration from single-provider format ---

function migrateToMultiProvider(): ProviderConfig[] {
  // Check if we already have multi-provider data
  const existing = loadProviderConfigs();
  if (existing.length > 0) return existing;

  // Try to migrate from old single-provider format
  const oldSettings = getLegacySettings();
  if (!oldSettings) return [];

  const id = generateId();
  const provider: ProviderConfig = {
    id,
    name: 'OpenAI',
    preset: detectPreset(oldSettings.baseUrl),
    baseUrl: oldSettings.baseUrl,
    model: oldSettings.model,
    enabled: true,
    isPrimary: true,
  };

  // Migrate the API key
  const isRemembered = localStorage.getItem(REMEMBER_FLAG) === 'true';
  if (oldSettings.apiKey) {
    setProviderKey(id, oldSettings.apiKey, isRemembered);
  }

  // Update provider name based on preset
  const preset = PROVIDER_PRESETS[provider.preset];
  provider.name = preset.name;

  const providers = [provider];
  saveProviderConfigs(providers);

  return providers;
}

function detectPreset(baseUrl: string): ProviderPreset {
  if (baseUrl.includes('perplexity')) return 'perplexity';
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) return 'ollama';
  if (baseUrl.includes('openai.com')) return 'openai';
  return 'custom';
}

function getLegacySettings(): LLMSettings | null {
  // Try new single-provider format
  const remembered = localStorage.getItem(REMEMBER_FLAG) === 'true';
  const apiKey = remembered
    ? localStorage.getItem(SESSION_KEY) || ''
    : sessionStorage.getItem(SESSION_KEY) || '';

  if (apiKey) {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        apiKey,
        baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
        model: parsed.model || 'gpt-4o',
      };
    } catch {
      return { apiKey, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
    }
  }

  // Try legacy formats
  const legacyKey = localStorage.getItem('llm_api_key');
  if (legacyKey) {
    return {
      apiKey: legacyKey,
      baseUrl: localStorage.getItem('llm_base_url') || 'https://api.openai.com/v1',
      model: localStorage.getItem('llm_model') || 'gpt-4o',
    };
  }

  try {
    const raw = localStorage.getItem('llm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey) {
        return {
          apiKey: parsed.apiKey,
          baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
          model: parsed.model || 'gpt-4o',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

// --- Public multi-provider API ---

/** Get all configured providers (migrates from single-provider format on first call). */
export function getAllProviders(): ProviderConfig[] {
  let providers = loadProviderConfigs();
  if (providers.length === 0) {
    providers = migrateToMultiProvider();
  }
  return providers;
}

/** Get only enabled providers. */
export function getEnabledProviders(): ProviderConfig[] {
  return getAllProviders().filter((p) => p.enabled);
}

/** Get the primary provider config + API key. Returns null if no primary or no key. */
export function getPrimaryProvider(): (ProviderConfig & { apiKey: string }) | null {
  const providers = getAllProviders();
  const primary = providers.find((p) => p.isPrimary && p.enabled);
  if (!primary) {
    // Fallback to first enabled provider
    const firstEnabled = providers.find((p) => p.enabled);
    if (!firstEnabled) return null;
    const apiKey = getProviderKey(firstEnabled.id);
    if (!apiKey && firstEnabled.preset !== 'ollama') return null;
    return { ...firstEnabled, apiKey };
  }
  const apiKey = getProviderKey(primary.id);
  if (!apiKey && primary.preset !== 'ollama') return null;
  return { ...primary, apiKey };
}

/** Get a provider's API key. */
export function getProviderApiKey(id: string): string {
  return getProviderKey(id);
}

/** Check if a provider's key is remembered across sessions. */
export function isProviderKeyRemembered(id: string): boolean {
  return getProviderKeysRemembered()[id] || false;
}

/** Save the full list of providers (configs only, not keys). */
export function saveProviders(providers: ProviderConfig[]): void {
  saveProviderConfigs(providers);
}

/** Add a new provider from a preset. Returns the new provider's ID. */
export function addProvider(preset: ProviderPreset): string {
  const providers = getAllProviders();
  const defaults = PROVIDER_PRESETS[preset];
  const id = generateId();
  const isFirst = providers.length === 0;

  providers.push({
    id,
    name: defaults.name,
    preset,
    baseUrl: defaults.baseUrl,
    model: defaults.model,
    enabled: true,
    isPrimary: isFirst,
  });

  saveProviderConfigs(providers);
  return id;
}

/** Remove a provider and its stored key. */
export function removeProvider(id: string): void {
  let providers = getAllProviders().filter((p) => p.id !== id);
  clearProviderKey(id);

  // If we removed the primary, promote the first remaining enabled provider
  if (providers.length > 0 && !providers.some((p) => p.isPrimary)) {
    const firstEnabled = providers.find((p) => p.enabled) || providers[0];
    firstEnabled.isPrimary = true;
  }

  saveProviderConfigs(providers);
}

/** Update a provider's config and/or key. */
export function updateProvider(
  id: string,
  updates: Partial<ProviderConfig> & { apiKey?: string; rememberKey?: boolean },
): void {
  const providers = getAllProviders();
  const idx = providers.findIndex((p) => p.id === id);
  if (idx < 0) return;

  // Handle primary flag: only one provider can be primary
  if (updates.isPrimary) {
    for (const p of providers) {
      p.isPrimary = p.id === id;
    }
  }

  // Update config fields
  const { apiKey, rememberKey, ...configUpdates } = updates;
  Object.assign(providers[idx], configUpdates);

  saveProviderConfigs(providers);

  // Update key if provided
  if (apiKey !== undefined) {
    setProviderKey(id, apiKey, rememberKey ?? isProviderKeyRemembered(id));
  } else if (rememberKey !== undefined) {
    // Just change the remember flag, moving the key between storages
    const currentKey = getProviderKey(id);
    if (currentKey) {
      setProviderKey(id, currentKey, rememberKey);
    }
  }
}

/** Save a provider's API key. */
export function saveProviderApiKey(id: string, key: string, remember: boolean): void {
  setProviderKey(id, key, remember);
}

// --- Ensemble mode ---

export function isEnsembleEnabled(): boolean {
  return localStorage.getItem(ENSEMBLE_KEY) === 'true';
}

export function setEnsembleEnabled(enabled: boolean): void {
  localStorage.setItem(ENSEMBLE_KEY, String(enabled));
}

// --- Backward-compatible API (used by existing consumers) ---

/** Returns true if the user opted in to persisting their key across sessions. */
export function isKeyRemembered(): boolean {
  // Check multi-provider format first
  const primary = getPrimaryProvider();
  if (primary) {
    return isProviderKeyRemembered(primary.id);
  }
  return localStorage.getItem(REMEMBER_FLAG) === 'true';
}

/**
 * Retrieve the full LLM settings from the primary provider.
 * Returns null if no API key is configured.
 */
export function getLLMSettings(): LLMSettings | null {
  const primary = getPrimaryProvider();
  if (primary) {
    return {
      apiKey: primary.apiKey,
      baseUrl: primary.baseUrl,
      model: primary.model,
    };
  }
  return null;
}

/**
 * Save LLM settings to the primary provider.
 * Creates a provider if none exists.
 */
export function saveLLMSettings(
  settings: LLMSettings,
  rememberKey: boolean,
): void {
  const providers = getAllProviders();
  const primaryIdx = providers.findIndex((p) => p.isPrimary);

  if (primaryIdx >= 0) {
    const p = providers[primaryIdx];
    p.baseUrl = settings.baseUrl;
    p.model = settings.model;
    p.preset = detectPreset(settings.baseUrl);
    saveProviderConfigs(providers);
    setProviderKey(p.id, settings.apiKey, rememberKey);
  } else {
    // Create a new provider
    const id = generateId();
    providers.push({
      id,
      name: PROVIDER_PRESETS[detectPreset(settings.baseUrl)].name,
      preset: detectPreset(settings.baseUrl),
      baseUrl: settings.baseUrl,
      model: settings.model,
      enabled: true,
      isPrimary: true,
    });
    saveProviderConfigs(providers);
    setProviderKey(id, settings.apiKey, rememberKey);
  }

  // Also write to legacy format for any code that reads it directly
  localStorage.setItem(REMEMBER_FLAG, String(rememberKey));
  if (rememberKey) {
    localStorage.setItem(SESSION_KEY, settings.apiKey);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, settings.apiKey);
    localStorage.removeItem(SESSION_KEY);
  }
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ baseUrl: settings.baseUrl, model: settings.model }),
  );

  // Clean up legacy
  localStorage.removeItem('llm_settings');
  localStorage.removeItem('llm_api_key');
  localStorage.removeItem('llm_base_url');
  localStorage.removeItem('llm_model');
}

/**
 * Clear the API key from all storage locations.
 */
export function clearLLMKey(): void {
  // Clear legacy
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_FLAG);

  // Clear all provider keys
  const providers = getAllProviders();
  for (const p of providers) {
    clearProviderKey(p.id);
  }
}

/**
 * Clear everything — key + settings.
 */
export function clearAllLLMSettings(): void {
  clearLLMKey();
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(PROVIDERS_KEY);
  localStorage.removeItem(PROVIDER_KEYS_REMEMBERED);
  localStorage.removeItem(ENSEMBLE_KEY);
  // Also clean legacy
  localStorage.removeItem('llm_settings');
  localStorage.removeItem('llm_api_key');
  localStorage.removeItem('llm_base_url');
  localStorage.removeItem('llm_model');
}

/** Get LLM settings for a specific provider by ID. Returns null if no key configured. */
export function getProviderSettings(id: string): LLMSettings | null {
  const providers = getAllProviders();
  const provider = providers.find((p) => p.id === id);
  if (!provider) return null;
  const apiKey = getProviderKey(id);
  if (!apiKey && provider.preset !== 'ollama') return null;
  return { apiKey, baseUrl: provider.baseUrl, model: provider.model };
}
