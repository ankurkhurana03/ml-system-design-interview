import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ModerationRule {
  name: string;
  description: string;
  enabled: boolean;
}

export interface ModerationConfig {
  id: string;
  mode: 'full_auto' | 'ai_assisted' | 'manual';
  rules: ModerationRule[];
  auto_respond_questions: boolean;
  confidence_threshold: number;
}

const STORAGE_KEY = 'moderation_config_fallback';

export function useModerationConfig() {
  const [config, setConfig] = useState<ModerationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch config from Supabase with localStorage fallback
  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        const parsedConfig: ModerationConfig = {
          id: data.id,
          mode: data.mode as 'full_auto' | 'ai_assisted' | 'manual',
          rules: data.rules as ModerationRule[],
          auto_respond_questions: data.auto_respond_questions ?? false,
          confidence_threshold: data.confidence_threshold ?? 0.8,
        };
        setConfig(parsedConfig);
        // Save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedConfig));
      }
    } catch (error) {
      console.error('Failed to fetch moderation config:', error);
      // Fallback to localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setConfig(JSON.parse(cached));
      } else {
        // Default config
        setConfig({
          id: 'local',
          mode: 'manual',
          rules: [
            {
              name: 'Reject spam',
              description: 'Reject obvious spam, promotional content, or irrelevant links',
              enabled: true,
            },
            {
              name: 'Approve ML-related',
              description: 'Approve questions and suggestions related to ML system design',
              enabled: true,
            },
            {
              name: 'Flag uncertain',
              description: 'Flag content that is borderline or ambiguous for human review',
              enabled: true,
            },
            {
              name: 'Reject offensive',
              description: 'Reject offensive, abusive, or hateful content',
              enabled: true,
            },
            {
              name: 'Auto-answer questions',
              description: 'Automatically generate answers for ML-related questions',
              enabled: true,
            },
          ],
          auto_respond_questions: false,
          confidence_threshold: 0.8,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update mode
  const updateMode = useCallback(
    async (mode: 'full_auto' | 'ai_assisted' | 'manual') => {
      if (!config) return;

      try {
        const { error } = await supabase
          .from('moderation_config')
          .update({ mode, updated_at: new Date().toISOString() })
          .eq('id', config.id);

        if (error) throw error;

        const newConfig = { ...config, mode };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch (error) {
        console.error('Failed to update mode:', error);
        // Update localStorage only
        const newConfig = { ...config, mode };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      }
    },
    [config],
  );

  // Update rules
  const updateRules = useCallback(
    async (rules: ModerationRule[]) => {
      if (!config) return;

      try {
        const { error } = await supabase
          .from('moderation_config')
          .update({ rules, updated_at: new Date().toISOString() })
          .eq('id', config.id);

        if (error) throw error;

        const newConfig = { ...config, rules };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch (error) {
        console.error('Failed to update rules:', error);
        // Update localStorage only
        const newConfig = { ...config, rules };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      }
    },
    [config],
  );

  // Toggle a specific rule
  const toggleRule = useCallback(
    async (ruleName: string) => {
      if (!config) return;

      const newRules = config.rules.map((rule) =>
        rule.name === ruleName ? { ...rule, enabled: !rule.enabled } : rule,
      );

      await updateRules(newRules);
    },
    [config, updateRules],
  );

  // Add a new rule
  const addRule = useCallback(
    async (rule: ModerationRule) => {
      if (!config) return;

      const newRules = [...config.rules, rule];
      await updateRules(newRules);
    },
    [config, updateRules],
  );

  // Remove a rule
  const removeRule = useCallback(
    async (ruleName: string) => {
      if (!config) return;

      const newRules = config.rules.filter((rule) => rule.name !== ruleName);
      await updateRules(newRules);
    },
    [config, updateRules],
  );

  // Update other settings
  const updateSettings = useCallback(
    async (updates: Partial<Pick<ModerationConfig, 'auto_respond_questions' | 'confidence_threshold'>>) => {
      if (!config) return;

      try {
        const { error } = await supabase
          .from('moderation_config')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', config.id);

        if (error) throw error;

        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch (error) {
        console.error('Failed to update settings:', error);
        // Update localStorage only
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      }
    },
    [config],
  );

  return {
    config,
    loading,
    updateMode,
    updateRules,
    toggleRule,
    addRule,
    removeRule,
    updateSettings,
  };
}
