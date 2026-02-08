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
      branch_ids,
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
      console.warn('[moderate-branches] No client-provided API key, falling back to DB lookup');
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

    // Fetch branches to moderate
    const { data: branches } = await supabase
      .from('generated_branches')
      .select('*')
      .in('id', branch_ids);

    if (!branches || branches.length === 0) {
      return new Response(JSON.stringify({ error: 'No branches found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt
    let systemPrompt = `You are a content moderator for an ML system design interview learning platform.
You are reviewing LLM-generated decision tree branches that users created during interviews.

Evaluate each branch for:
1. Technical accuracy — Does the ML content make sense?
2. Structural validity — Are node types, stages, and references well-formed?
3. Topical relevance — Does the branch fit the problem context?

For each branch, decide:
- "approve" — technically sound, well-structured, relevant to the problem
- "reject" — incorrect ML concepts, broken structure, or off-topic

Respond with a JSON array:
[{ "branch_id": "id", "decision": "approve|reject", "reason": "brief reason", "confidence": 0.0-1.0 }]

Include a confidence score where:
- 1.0 = completely certain
- 0.8 = highly confident
- 0.6 = moderately confident
- 0.5 or below = uncertain, needs human review

Be lenient with creative approaches that are technically valid.`;

    if (rules && Array.isArray(rules) && rules.length > 0) {
      systemPrompt += '\n\nAdditional moderation rules:\n';
      rules.forEach((rule: string, idx: number) => {
        systemPrompt += `${idx + 1}. ${rule}\n`;
      });
    }

    const userPrompt = `Moderate these generated branches:\n${JSON.stringify(
      branches.map((b) => ({
        id: b.id,
        problem_id: b.problem_id,
        target_node_id: b.target_node_id,
        choice_label: b.choice_label,
        choice_answer: b.choice_answer,
        yaml_content: b.yaml_content.substring(0, 2000),
        author: b.author_name,
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

    // Parse decisions
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
      let finalStatus = decision.decision === 'approve' ? 'approved' : 'rejected';

      // Low-confidence decisions stay pending for human review
      if (confidence < threshold) {
        finalStatus = 'pending';
      }

      await supabase
        .from('generated_branches')
        .update({
          status: finalStatus,
          moderation_reason: decision.reason || null,
          moderation_confidence: confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', decision.branch_id);

      // Log to audit
      await supabase.from('moderation_audit_log').insert({
        comment_id: decision.branch_id,
        action: finalStatus,
        actor_type: 'ai',
        actor_id: user_id,
        actor_name: 'AI Moderator',
        reason: decision.reason || 'Auto-moderated',
        confidence,
        metadata: { item_type: 'branch', model },
      });

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
