/**
 * Secure client-side storage for LLM API credentials.
 *
 * Design principles:
 * - API key NEVER touches the server/database
 * - Default: sessionStorage (cleared when tab closes)
 * - Opt-in: localStorage via "remember key" toggle (persists across sessions)
 * - Non-sensitive settings (baseUrl, model) always use localStorage
 */

const SESSION_KEY = 'llm_api_key';
const REMEMBER_FLAG = 'llm_key_remembered';
const SETTINGS_KEY = 'llm_settings_nonsecret';

export interface LLMSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Returns true if the user opted in to persisting their key across sessions. */
export function isKeyRemembered(): boolean {
  return localStorage.getItem(REMEMBER_FLAG) === 'true';
}

/** Get the stored API key from the appropriate storage. */
function getStoredKey(): string {
  if (isKeyRemembered()) {
    return localStorage.getItem(SESSION_KEY) || '';
  }
  return sessionStorage.getItem(SESSION_KEY) || '';
}

/** Get non-sensitive settings (baseUrl, model) from localStorage. */
function getNonSecretSettings(): { baseUrl: string; model: string } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
        model: parsed.model || 'gpt-4o',
      };
    }
  } catch {
    // corrupted data, return defaults
  }
  return { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
}

/**
 * Retrieve the full LLM settings.
 * Returns null if no API key is configured.
 */
export function getLLMSettings(): LLMSettings | null {
  const apiKey = getStoredKey();
  if (!apiKey) {
    // Migrate from legacy llm_settings localStorage format (one-time)
    const legacy = migrateLegacySettings();
    if (legacy) return legacy;
    return null;
  }
  const { baseUrl, model } = getNonSecretSettings();
  return { apiKey, baseUrl, model };
}

/**
 * Save LLM settings.
 * - apiKey goes to sessionStorage (or localStorage if rememberKey is true)
 * - baseUrl + model go to localStorage (non-sensitive)
 */
export function saveLLMSettings(
  settings: LLMSettings,
  rememberKey: boolean,
): void {
  // Save the remember preference
  localStorage.setItem(REMEMBER_FLAG, String(rememberKey));

  // Store the API key in the chosen storage
  if (rememberKey) {
    localStorage.setItem(SESSION_KEY, settings.apiKey);
    // Clean up sessionStorage if it had a key
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, settings.apiKey);
    // Clean up localStorage if it had a key from a previous "remember" session
    localStorage.removeItem(SESSION_KEY);
  }

  // Non-sensitive settings always go to localStorage
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ baseUrl: settings.baseUrl, model: settings.model }),
  );

  // Clean up legacy format
  localStorage.removeItem('llm_settings');
  localStorage.removeItem('llm_api_key');
  localStorage.removeItem('llm_base_url');
  localStorage.removeItem('llm_model');
}

/**
 * Clear the API key from all storage locations.
 * Called on sign-out or explicit key removal.
 */
export function clearLLMKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_FLAG);
}

/**
 * Clear everything — key + settings.
 * Called on full sign-out.
 */
export function clearAllLLMSettings(): void {
  clearLLMKey();
  localStorage.removeItem(SETTINGS_KEY);
  // Also clean legacy
  localStorage.removeItem('llm_settings');
  localStorage.removeItem('llm_api_key');
  localStorage.removeItem('llm_base_url');
  localStorage.removeItem('llm_model');
}

/**
 * One-time migration from legacy `llm_settings` localStorage format.
 * Reads the old format, writes to new format, deletes the old key.
 */
function migrateLegacySettings(): LLMSettings | null {
  try {
    // Check new-format individual key first
    const legacyKey = localStorage.getItem('llm_api_key');
    if (legacyKey) {
      const settings: LLMSettings = {
        apiKey: legacyKey,
        baseUrl: localStorage.getItem('llm_base_url') || 'https://api.openai.com/v1',
        model: localStorage.getItem('llm_model') || 'gpt-4o',
      };
      // Migrate: save in new format (remember=true since it was already in localStorage)
      saveLLMSettings(settings, true);
      return settings;
    }

    // Check the JSON blob format
    const raw = localStorage.getItem('llm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey) {
        const settings: LLMSettings = {
          apiKey: parsed.apiKey,
          baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
          model: parsed.model || 'gpt-4o',
        };
        // Migrate: save in new format (remember=true since it was already in localStorage)
        saveLLMSettings(settings, true);
        return settings;
      }
    }
  } catch {
    // migration failed, not critical
  }
  return null;
}
