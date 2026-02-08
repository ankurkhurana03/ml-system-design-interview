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
      comment_id,
      admin_user_id,
      // Client-provided LLM credentials (preferred — key never stored server-side)
      llm_api_key,
      llm_base_url,
      llm_model,
    } = await req.json();

    if (!comment_id || !admin_user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: comment_id, admin_user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is admin
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', admin_user_id)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the comment
    const { data: comment, error: commentError } = await supabase
      .from('node_comments')
      .select('*')
      .eq('id', comment_id)
      .single();

    if (commentError || !comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process questions
    if (comment.comment_type !== 'question') {
      return new Response(
        JSON.stringify({ error: 'Only comments with type "question" can be auto-answered' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Check if already answered
    const { data: existingAnswers } = await supabase
      .from('node_comments')
      .select('id')
      .eq('parent_id', comment_id)
      .eq('comment_type', 'answer');

    if (existingAnswers && existingAnswers.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Question already has an answer', skipped: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Determine LLM settings: prefer client-provided, fallback to DB (legacy)
    let apiKey = llm_api_key;
    let baseUrl = llm_base_url || 'https://api.openai.com/v1';
    let model = llm_model || 'gpt-4o';

    if (!apiKey) {
      console.warn('[auto-respond] No client-provided API key, falling back to DB lookup');
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('llm_api_key_encrypted, llm_base_url, llm_model')
        .eq('user_id', admin_user_id)
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

    // Build system prompt with context
    const systemPrompt = `You are an ML system design expert and teaching assistant. A student asked a question while practicing ML system design interviews.

Context: This question is about a node in the "${comment.problem_id}" problem at node "${comment.node_id}".

Answer the question concisely and helpfully. Focus on practical ML engineering knowledge.
If you're not confident in the answer, say so. Keep answers under 200 words.

Be encouraging and educational in your tone.`;

    const userPrompt = `Question: ${comment.content}`;

    // Call LLM — key is transient, never persisted
    const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
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

    // Insert the answer as a new comment
    const { data: answerComment, error: insertError } = await supabase
      .from('node_comments')
      .insert({
        problem_id: comment.problem_id,
        node_id: comment.node_id,
        user_id: null,
        author_name: 'AI Assistant',
        content: answer,
        comment_type: 'answer',
        parent_id: comment_id,
        status: 'approved',
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Failed to insert answer: ${insertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        comment_id: answerComment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in auto-respond function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
