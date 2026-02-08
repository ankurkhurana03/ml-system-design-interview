import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  getAllProviders,
  saveProviders,
  addProvider,
  removeProvider,
  getProviderApiKey,
  isProviderKeyRemembered,
  saveProviderApiKey,
  isEnsembleEnabled,
  setEnsembleEnabled,
  PROVIDER_PRESETS,
} from '@/utils/llmKeyStore';
import type { ProviderConfig, ProviderPreset } from '@/utils/llmKeyStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderFormState {
  apiKey: string;
  rememberKey: boolean;
  showApiKey: boolean;
  baseUrl: string;
  model: string;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [formStates, setFormStates] = useState<Record<string, ProviderFormState>>({});
  const [ensemble, setEnsemble] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen, user]);

  const loadSettings = () => {
    const loaded = getAllProviders();
    setProviders(loaded);
    setEnsemble(isEnsembleEnabled());

    // Initialize form states for each provider
    const states: Record<string, ProviderFormState> = {};
    for (const p of loaded) {
      states[p.id] = {
        apiKey: getProviderApiKey(p.id),
        rememberKey: isProviderKeyRemembered(p.id),
        showApiKey: false,
        baseUrl: p.baseUrl,
        model: p.model,
      };
    }
    setFormStates(states);
  };

  const handleAddProvider = (preset: ProviderPreset) => {
    const id = addProvider(preset);
    const updated = getAllProviders();
    setProviders(updated);
    setFormStates((prev) => ({
      ...prev,
      [id]: {
        apiKey: '',
        rememberKey: false,
        showApiKey: false,
        baseUrl: PROVIDER_PRESETS[preset].baseUrl,
        model: PROVIDER_PRESETS[preset].model,
      },
    }));
  };

  const handleRemoveProvider = (id: string) => {
    removeProvider(id);
    const updated = getAllProviders();
    setProviders(updated);
    setFormStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSetPrimary = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.id === id })),
    );
  };

  const handleToggleEnabled = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  const updateFormState = (id: string, updates: Partial<ProviderFormState>) => {
    setFormStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Apply form state changes to provider configs
      const updatedProviders = providers.map((p) => {
        const form = formStates[p.id];
        if (!form) return p;
        return { ...p, baseUrl: form.baseUrl, model: form.model };
      });

      // Save provider configs
      saveProviders(updatedProviders);

      // Save API keys for each provider
      for (const p of updatedProviders) {
        const form = formStates[p.id];
        if (form) {
          saveProviderApiKey(p.id, form.apiKey, form.rememberKey);
        }
      }

      // Save ensemble setting
      setEnsembleEnabled(ensemble);

      // Save non-sensitive settings to Supabase for cross-device sync
      if (user) {
        const primary = updatedProviders.find((p) => p.isPrimary);
        if (primary) {
          const form = formStates[primary.id];
          await supabase.from('user_settings').upsert({
            user_id: user.id,
            llm_base_url: form?.baseUrl || primary.baseUrl,
            llm_model: form?.model || primary.model,
            updated_at: new Date().toISOString(),
          });
        }
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const enabledCount = providers.filter((p) => p.enabled).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="absolute inset-0 md:inset-y-0 md:left-auto md:right-0 md:max-w-lg w-full bg-white dark:bg-gray-800 shadow-2xl dark:shadow-gray-900/50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">LLM Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Security info */}
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Your API keys stay on your device</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Keys are stored in your browser only and sent directly to LLM providers over HTTPS. They are never saved to our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Providers Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Providers
            </h3>

            {/* Quick-add preset buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.keys(PROVIDER_PRESETS) as ProviderPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAddProvider(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {PROVIDER_PRESETS[preset].name}
                </button>
              ))}
            </div>

            {/* Provider cards */}
            <div className="space-y-4">
              {providers.map((provider) => {
                const form = formStates[provider.id];
                if (!form) return null;

                return (
                  <div
                    key={provider.id}
                    className={`rounded-lg border p-4 ${
                      provider.isPrimary
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/20'
                        : provider.enabled
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{provider.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          {provider.preset}
                        </span>
                        {provider.isPrimary && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!provider.isPrimary && provider.enabled && (
                          <button
                            onClick={() => handleSetPrimary(provider.id)}
                            title="Set as primary"
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            Set primary
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveProvider(provider.id)}
                          title="Remove provider"
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Base URL */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Base URL
                        </label>
                        <input
                          type="text"
                          value={form.baseUrl}
                          onChange={(e) => updateFormState(provider.id, { baseUrl: e.target.value })}
                          placeholder={PROVIDER_PRESETS[provider.preset].baseUrl}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={form.showApiKey ? 'text' : 'password'}
                            value={form.apiKey}
                            onChange={(e) => updateFormState(provider.id, { apiKey: e.target.value })}
                            placeholder={provider.preset === 'ollama' ? '(optional for Ollama)' : 'sk-...'}
                            autoComplete="off"
                            className="w-full px-3 py-1.5 pr-9 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateFormState(provider.id, { showApiKey: !form.showApiKey })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                          >
                            {form.showApiKey ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.rememberKey}
                            onChange={(e) => updateFormState(provider.id, { rememberKey: e.target.checked })}
                            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Remember key</span>
                        </label>
                      </div>

                      {/* Model */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          value={form.model}
                          onChange={(e) => updateFormState(provider.id, { model: e.target.value })}
                          placeholder={PROVIDER_PRESETS[provider.preset].model}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>

                      {/* Enabled toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={() => handleToggleEnabled(provider.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Enabled</span>
                      </label>
                    </div>
                  </div>
                );
              })}

              {providers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No providers configured. Click a button above to add one.
                </div>
              )}
            </div>
          </div>

          {/* Ensemble Mode */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Ensemble Mode
            </h3>
            <div className={`rounded-lg border p-4 ${enabledCount < 2 ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60' : 'border-gray-200 dark:border-gray-700'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ensemble}
                  onChange={(e) => setEnsemble(e.target.checked)}
                  disabled={enabledCount < 2}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Call all enabled providers and synthesize
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {enabledCount < 2
                      ? 'Requires 2 or more enabled providers'
                      : `${enabledCount} providers enabled — responses will be collated by the primary provider`}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Auth Status */}
          {!user && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Sign in to sync your base URL and model settings across devices. Your API keys always stay local.
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
