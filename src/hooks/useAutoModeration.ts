import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getLLMSettings } from '@/utils/llmKeyStore';
import type { ModerationConfig } from '@/hooks/useModerationConfig';

interface UseAutoModerationOptions {
  config: ModerationConfig | null;
  enabled: boolean;
}

export function useAutoModeration({ config, enabled }: UseAutoModerationOptions) {
  const { user } = useAuth();
  const processingRef = useRef(new Set<string>());
  const pollingIntervalRef = useRef<number | null>(null);

  // Process pending comments
  const processPendingComments = useCallback(async () => {
    if (!user || !config || !enabled || config.mode !== 'full_auto') {
      return;
    }

    try {
      // Fetch pending comments
      const { data: comments, error } = await supabase
        .from('node_comments')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      if (!comments || comments.length === 0) return;

      // Filter out comments already being processed
      const toProcess = comments.filter((c) => !processingRef.current.has(c.id));
      if (toProcess.length === 0) return;

      // Mark as processing
      toProcess.forEach((c) => processingRef.current.add(c.id));

      // Prepare rules for LLM
      const enabledRules = config.rules.filter((r) => r.enabled).map((r) => r.description);

      // Pass LLM settings from client-side store (key never stored server-side)
      const settings = getLLMSettings();
      if (!settings) {
        console.error('No LLM settings configured for auto-moderation');
        return;
      }

      // Call moderate-comments edge function
      const { error: moderateError } = await supabase.functions.invoke('moderate-comments', {
        body: {
          comment_ids: toProcess.map((c) => c.id),
          user_id: user.id,
          rules: enabledRules,
          confidence_threshold: config.confidence_threshold,
          llm_api_key: settings.apiKey,
          llm_base_url: settings.baseUrl,
          llm_model: settings.model,
        },
      });

      if (moderateError) {
        console.error('Auto-moderation error:', moderateError);
      }

      // Remove from processing set
      toProcess.forEach((c) => processingRef.current.delete(c.id));
    } catch (error) {
      console.error('Failed to auto-moderate:', error);
    }
  }, [user, config, enabled]);

  // Set up realtime subscription
  useEffect(() => {
    if (!enabled || !config || config.mode !== 'full_auto') {
      return;
    }

    // Subscribe to new pending comments
    const channel = supabase
      .channel('auto-moderation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'node_comments',
          filter: 'status=eq.pending',
        },
        (payload) => {
          console.log('New pending comment detected:', payload.new);
          // Process immediately
          processPendingComments();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Auto-moderation realtime active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime subscription failed, falling back to polling');
        }
      });

    // Initial processing
    processPendingComments();

    // Fallback: Set up polling every 30 seconds
    pollingIntervalRef.current = window.setInterval(() => {
      processPendingComments();
    }, 30000);

    return () => {
      channel.unsubscribe();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, config, processPendingComments]);

  return {
    isActive: enabled && config?.mode === 'full_auto',
  };
}
