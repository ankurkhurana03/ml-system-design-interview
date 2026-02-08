import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      question,
      node_content,
      node_stage,
      problem_title,
      user_id,
      custom_messages,
      // Client-provided LLM credentials (preferred — key never stored server-side)
      llm_api_key,
      llm_base_url,
      llm_model,
    } = await req.json();

    if (!question || !node_content) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine LLM settings: prefer client-provided, fallback to DB (legacy)
    let apiKey = llm_api_key;
    let baseUrl = llm_base_url || 'https://api.openai.com/v1';
    let model = llm_model || 'gpt-4o';

    if (!apiKey && user_id) {
      // Legacy fallback: read from DB (will be removed in future)
      console.warn('[answer-question] No client-provided API key, falling back to DB lookup');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('llm_api_key_encrypted, llm_base_url, llm_model')
        .eq('user_id', user_id)
        .single();

      if (settingsError || !settings?.llm_api_key_encrypted) {
        return new Response(
          JSON.stringify({ error: 'No API key configured. Please configure your LLM settings.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      apiKey = settings.llm_api_key_encrypted;
      baseUrl = settings.llm_base_url || baseUrl;
      model = settings.llm_model || model;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No API key provided. Please configure your LLM settings.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Build messages
    let messages;
    if (custom_messages) {
      messages = custom_messages;
    } else {
      const systemPrompt = `You are an ML system design expert and interview coach. Your role is to help candidates learn and understand ML system design concepts through clear, concise, and educational answers.

When answering questions:
1. Be concise but thorough (2-4 paragraphs)
2. Use concrete examples when helpful
3. Relate the answer to the current interview context
4. Focus on practical, real-world considerations
5. If the question is unclear, make reasonable assumptions and state them
6. Use a friendly, supportive tone

Current context:
- Problem: ${problem_title || 'ML System Design Interview'}
- Interview stage: ${node_stage || 'general'}
- Node content: ${node_content.substring(0, 200)}${node_content.length > 200 ? '...' : ''}`;

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${question}` },
      ];
    }

    // Call LLM — key is transient, never persisted
    const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      return new Response(
        JSON.stringify({ error: `LLM API error: ${errorText}` }),
        {
          status: llmResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const llmData = await llmResponse.json();
    const answer = llmData.choices?.[0]?.message?.content || '';

    if (!answer) {
      return new Response(
        JSON.stringify({ error: 'No answer generated' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ answer }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in answer-question function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
