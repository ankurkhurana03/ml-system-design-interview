import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getLLMSettings } from '@/utils/llmKeyStore';

export interface AIAnswerResponse {
  answer: string;
  question: string;
  timestamp: string;
}

export function useAIAnswer() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(
    async (
      question: string,
      nodeContent: string,
      nodeStage: string,
      problemTitle: string,
    ): Promise<string | null> => {
      if (!question.trim()) {
        setError('Question cannot be empty');
        return null;
      }

      setLoading(true);
      setError(null);
      setAnswer(null);

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
              return data.answer;
            }
          } catch {
            // Fall through to direct API call
          }
        }

        // Direct API call — key sent from browser to LLM provider over HTTPS
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

        const response = await fetch(`${settings.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: question },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LLM API error: ${errorText}`);
        }

        const data = await response.json();
        const answerText = data.choices?.[0]?.message?.content || '';

        if (!answerText) {
          throw new Error('No answer generated');
        }

        setAnswer(answerText);
        return answerText;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get AI answer';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { answer, loading, error, askQuestion };
}
