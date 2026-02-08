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
      comment_ids,
      user_id,
      rules,
      confidence_threshold,
      // Client-provided LLM credentials (preferred — key never stored server-side)
      llm_api_key,
      llm_base_url,
      llm_model,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is admin
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user_id)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine LLM settings: prefer client-provided, fallback to DB (legacy)
    let apiKey = llm_api_key;
    let baseUrl = llm_base_url || 'https://api.openai.com/v1';
    let model = llm_model || 'gpt-4o';

    if (!apiKey) {
      console.warn('[moderate-comments] No client-provided API key, falling back to DB lookup');
      const { data: settings } = await supabase
        .from('user_settings')
        .select('llm_api_key_encrypted, llm_base_url, llm_model')
        .eq('user_id', user_id)
        .single();

      if (!settings?.llm_api_key_encrypted) {
        return new Response(JSON.stringify({ error: 'No API key configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      apiKey = settings.llm_api_key_encrypted;
      baseUrl = settings.llm_base_url || baseUrl;
      model = settings.llm_model || model;
    }

    // Fetch comments to moderate
    const { data: comments } = await supabase
      .from('node_comments')
      .select('*')
      .in('id', comment_ids);

    if (!comments || comments.length === 0) {
      return new Response(JSON.stringify({ error: 'No comments found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt with rules
    let systemPrompt = `You are a content moderator for an ML system design interview learning platform.
Evaluate each comment and decide:
- "approved" - constructive, relevant, helpful suggestion/question/feedback
- "rejected" - spam, offensive, off-topic, low-quality, or inappropriate
- "answer" - if you can provide a helpful answer to a question, include your answer

For each comment, respond with a JSON array:
[{ "id": "comment-id", "decision": "approved|rejected", "reason": "brief reason", "confidence": 0.0-1.0, "answer": "optional answer if the comment is a question" }]

Include a confidence score (0.0 to 1.0) for each decision where:
- 1.0 = completely certain
- 0.8 = highly confident
- 0.6 = moderately confident
- 0.5 or below = uncertain, needs human review

Be lenient with genuine questions even if poorly worded. Reject only clearly inappropriate content.`;

    // Add custom rules if provided
    if (rules && Array.isArray(rules) && rules.length > 0) {
      systemPrompt += '\n\nYou must follow these moderation rules:\n';
      rules.forEach((rule: string, idx: number) => {
        systemPrompt += `${idx + 1}. ${rule}\n`;
      });
    }

    const userPrompt = `Moderate these comments:\n${JSON.stringify(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        type: c.comment_type,
        author: c.author_name,
      })),
      null,
      2,
    )}`;

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
        temperature: 0.3,
      }),
    });

    const llmData = await llmResponse.json();
    const responseText = llmData.choices?.[0]?.message?.content || '';

    // Parse the moderation decisions
    let decisions;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      decisions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse LLM response', raw: responseText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Apply decisions
    const results = [];
    const threshold = confidence_threshold ?? 0.8;

    for (const decision of decisions) {
      const confidence = decision.confidence ?? 1.0;
      let finalStatus = decision.decision;

      // In AI-assisted mode, flag low-confidence decisions for review
      if (confidence < threshold) {
        finalStatus = 'pending';
      }

      await supabase
        .from('node_comments')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('id', decision.id);

      // If LLM provided an answer to a question, insert it as a reply
      if (decision.answer && finalStatus === 'approved') {
        const originalComment = comments.find((c) => c.id === decision.id);
        if (originalComment) {
          await supabase.from('node_comments').insert({
            problem_id: originalComment.problem_id,
            node_id: originalComment.node_id,
            user_id: user_id,
            author_name: 'AI Moderator',
            content: decision.answer,
            comment_type: 'answer',
            parent_id: decision.id,
            status: 'approved',
          });
        }
      }
      results.push({ ...decision, finalStatus, confidence });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
