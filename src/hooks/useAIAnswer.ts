import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getLLMSettings } from '@/utils/llmKeyStore';
import { callLLMStreaming, callLLMWithSources } from '@/utils/llmClient';
import type { UserSource, ParsedCitation } from '@/types/tree';

export interface AIAnswerResponse {
  answer: string;
  question: string;
  timestamp: string;
  sourceCitations?: ParsedCitation[];
}

export function useAIAnswer() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sourceCitations, setSourceCitations] = useState<ParsedCitation[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const askQuestion = useCallback(
    async (
      question: string,
      nodeContent: string,
      nodeStage: string,
      problemTitle: string,
      sources?: UserSource[],
    ): Promise<string | null> => {
      if (!question.trim()) {
        setError('Question cannot be empty');
        return null;
      }

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setIsStreaming(false);
      setStreamingText(null);
      setError(null);
      setAnswer(null);
      setSourceCitations(undefined);

      try {
        const settings = getLLMSettings();
        if (!settings) {
          throw new Error('No LLM settings configured. Please configure your API key in settings.');
        }

        // Try Edge Function first (passes key in body, never stored server-side)
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (userId) {
          try {
            const { data, error: funcError } = await supabase.functions.invoke('answer-question', {
              body: {
                question,
                node_content: nodeContent,
                node_stage: nodeStage,
                problem_title: problemTitle,
                user_id: userId,
                llm_api_key: settings.apiKey,
                llm_base_url: settings.baseUrl,
                llm_model: settings.model,
              },
            });

            if (!funcError && data?.answer) {
              setAnswer(data.answer);
              setLoading(false);
              return data.answer;
            }
          } catch {
            // Fall through to direct API call
          }
        }

        const systemPrompt = `You are an ML system design expert and interview coach. Your role is to help candidates learn and understand ML system design concepts through clear, concise, and educational answers.

When answering questions:
1. Be concise but thorough (2-4 paragraphs)
2. Use concrete examples when helpful
3. Relate the answer to the current interview context
4. Focus on practical, real-world considerations
5. If the question is unclear, make reasonable assumptions and state them
6. Use a friendly, supportive tone

Current context:
- Problem: ${problemTitle}
- Interview stage: ${nodeStage}
- Node content: ${nodeContent.substring(0, 200)}${nodeContent.length > 200 ? '...' : ''}`;

        let answerText: string;
        let citations: ParsedCitation[] | undefined;

        if (sources && sources.length > 0) {
          // Source grounding uses non-streaming path (needs citation extraction)
          const response = await callLLMWithSources(
            { systemPrompt, userMessage: question, maxTokens: 1000, signal: abortController.signal },
            sources,
          );
          answerText = response.content;
          citations = response.sourceCitations;
        } else {
          // Use streaming for direct LLM calls
          setIsStreaming(true);
          answerText = await callLLMStreaming({
            systemPrompt,
            userMessage: question,
            maxTokens: 1000,
            signal: abortController.signal,
            onChunk: (text) => {
              setStreamingText(text);
            },
          });
        }

        if (!answerText) {
          throw new Error('No answer generated');
        }

        // Streaming complete: set final answer and clear streaming state
        setIsStreaming(false);
        setStreamingText(null);
        setAnswer(answerText);
        setSourceCitations(citations);
        return answerText;
      } catch (err) {
        if (abortController.signal.aborted) {
          // Request was cancelled, not an error
          return null;
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to get AI answer';
        setError(errorMessage);
        return null;
      } finally {
        setIsStreaming(false);
        setLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [],
  );

  return { answer, streamingText, isStreaming, sourceCitations, loading, error, askQuestion };
}
