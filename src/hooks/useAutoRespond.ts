import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getLLMSettings } from '@/utils/llmKeyStore';

interface UseAutoRespondReturn {
  enabled: boolean;
  processing: boolean;
  processedCount: number;
  enableAutoRespond: () => void;
  disableAutoRespond: () => void;
  autoRespondToComment: (commentId: string) => Promise<void>;
}

const STORAGE_KEY = 'auto_respond_enabled';
const POLL_INTERVAL = 30000; // 30 seconds
const PROCESSED_STORAGE_KEY = 'auto_respond_processed';

export function useAutoRespond(userId: string | null): UseAutoRespondReturn {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Load processed IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PROCESSED_STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        processedIdsRef.current = new Set(ids);
      } catch {
        processedIdsRef.current = new Set();
      }
    }
  }, []);

  // Save processed IDs to localStorage
  const saveProcessedIds = useCallback(() => {
    const ids = Array.from(processedIdsRef.current);
    localStorage.setItem(PROCESSED_STORAGE_KEY, JSON.stringify(ids));
  }, []);

  // Auto-respond to a single comment
  const autoRespondToComment = useCallback(
    async (commentId: string) => {
      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      if (processedIdsRef.current.has(commentId)) {
        console.log('Comment already processed:', commentId);
        return;
      }

      try {
        const settings = getLLMSettings();
        if (!settings) {
          console.error('No LLM settings configured');
          return;
        }

        const { data, error } = await supabase.functions.invoke('auto-respond', {
          body: {
            comment_id: commentId,
            admin_user_id: userId,
            llm_api_key: settings.apiKey,
            llm_base_url: settings.baseUrl,
            llm_model: settings.model,
          },
        });

        if (error) {
          console.error('Auto-respond error:', error);
          return;
        }

        if (data?.success) {
          processedIdsRef.current.add(commentId);
          saveProcessedIds();
          setProcessedCount((prev) => prev + 1);
        } else if (data?.skipped) {
          // Already has an answer, mark as processed
          processedIdsRef.current.add(commentId);
          saveProcessedIds();
        }
      } catch (err) {
        console.error('Failed to auto-respond:', err);
      }
    },
    [userId, saveProcessedIds],
  );

  // Check for unanswered questions and auto-respond
  const checkAndRespond = useCallback(async () => {
    if (!userId || processing) return;

    setProcessing(true);

    try {
      // Fetch approved questions without answers
      const { data: questions, error } = await supabase
        .from('node_comments')
        .select('id, parent_id')
        .eq('comment_type', 'question')
        .eq('status', 'approved')
        .is('parent_id', null)
        .order('created_at', { ascending: true })
        .limit(10); // Process up to 10 at a time

      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }

      if (!questions || questions.length === 0) {
        return;
      }

      // Filter out already processed questions
      const unprocessedQuestions = questions.filter(
        (q) => !processedIdsRef.current.has(q.id),
      );

      if (unprocessedQuestions.length === 0) {
        return;
      }

      // For each question, check if it already has an answer
      for (const question of unprocessedQuestions) {
        const { data: answers } = await supabase
          .from('node_comments')
          .select('id')
          .eq('parent_id', question.id)
          .eq('comment_type', 'answer');

        if (answers && answers.length > 0) {
          // Already has an answer, mark as processed
          processedIdsRef.current.add(question.id);
          saveProcessedIds();
          continue;
        }

        // Auto-respond to this question
        await autoRespondToComment(question.id);
      }
    } catch (err) {
      console.error('Error in checkAndRespond:', err);
    } finally {
      setProcessing(false);
    }
  }, [userId, processing, autoRespondToComment, saveProcessedIds]);

  // Enable auto-respond
  const enableAutoRespond = useCallback(() => {
    setEnabled(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  // Disable auto-respond
  const disableAutoRespond = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(STORAGE_KEY, 'false');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Set up polling when enabled
  useEffect(() => {
    if (enabled && userId) {
      // Initial check
      checkAndRespond();

      // Set up polling
      intervalRef.current = window.setInterval(() => {
        checkAndRespond();
      }, POLL_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [enabled, userId, checkAndRespond]);

  return {
    enabled,
    processing,
    processedCount,
    enableAutoRespond,
    disableAutoRespond,
    autoRespondToComment,
  };
}
