import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERATE_SYSTEM_PROMPT = `You are an expert ML system design interviewer. Your task is to generate a complete decision tree for an ML system design interview.

YAML SCHEMA:
\`\`\`yaml
id: string                  # Unique problem identifier (e.g., "fraud-detection")
title: string               # Problem title
description: string         # Brief problem description
root: string                # ID of the root node
nodes:
  - id: string              # Unique node identifier
    stage: MLStage          # One of: problem_definition, metrics, data, features, model, training, deployment, monitoring
    type: NodeType          # One of: info, question, terminal
    label: string           # Short label for graph visualization
    speaker: Speaker        # One of: interviewer, candidate
    content: string         # Full content (question or information)
    next: string?           # For info nodes: next node ID
    choices:                # For question nodes: array of choices
      - label: string       # Choice label
        answer: string      # Detailed answer text
        next: string        # Next node ID after this choice
\`\`\`

RULES:
1. The tree MUST go through all 8 ML stages in order: problem_definition → metrics → data → features → model → training → deployment → monitoring
2. Create 2-3 branching points (question nodes) where different choices lead to different paths
3. All branches must eventually reach the monitoring stage with a terminal node
4. Use both interviewer and candidate speakers to create natural dialogue flow
5. Make answers detailed and educational (3-5 sentences each)
6. Use descriptive IDs like "pd_1", "metrics_1", "data_question", etc.
7. Terminal nodes mark the end of an interview path

Generate a complete, valid YAML tree. Output ONLY the YAML, no additional text.`;

const BRANCH_SYSTEM_PROMPT = `You are an expert ML system design interviewer. Your task is to generate NEW branch nodes to extend an existing decision tree.

RULES:
1. Generate ONLY the new nodes (not the entire tree)
2. Use unique IDs with a \`gen_\` prefix (e.g., "gen_data_1", "gen_model_question")
3. Continue from the target node's stage through the remaining stages
4. Maintain consistency with the existing tree structure
5. Follow the same 8-stage order: problem_definition → metrics → data → features → model → training → deployment → monitoring
6. End with a terminal node in the monitoring stage

OUTPUT FORMAT:
Return ONLY a YAML array of new nodes.

Generate ONLY the YAML array of new nodes, no additional text.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      problem_description,
      user_id,
      mode,
      existing_yaml,
      target_node_id,
      user_prompt,
      // Client-provided LLM credentials (preferred — key never stored server-side)
      llm_api_key,
      llm_base_url,
      llm_model,
    } = await req.json();

    // Determine LLM settings: prefer client-provided, fallback to DB (legacy)
    let apiKey = llm_api_key;
    let baseUrl = llm_base_url || 'https://api.openai.com/v1';
    let model = llm_model || 'gpt-4o';

    if (!apiKey && user_id) {
      console.warn('[generate-tree] No client-provided API key, falling back to DB lookup');
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
        return new Response(JSON.stringify({ error: 'No API key configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      apiKey = settings.llm_api_key_encrypted;
      baseUrl = settings.llm_base_url || baseUrl;
      model = settings.llm_model || model;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt based on mode
    let systemPrompt: string;
    let userPromptText: string;

    if (mode === 'generate') {
      systemPrompt = GENERATE_SYSTEM_PROMPT;
      userPromptText = `Generate a complete ML system design interview decision tree for the following problem:\n\n${problem_description}`;
    } else if (mode === 'branch') {
      systemPrompt = BRANCH_SYSTEM_PROMPT;
      userPromptText = `Existing tree YAML:\n\`\`\`yaml\n${existing_yaml}\n\`\`\`\n\nTarget node ID: ${target_node_id}\nUser request: ${user_prompt}\n\nGenerate ONLY the new branch nodes.`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call user's LLM — key is transient, never persisted
    const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPromptText },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      return new Response(JSON.stringify({ error: `LLM API error: ${errorText}` }), {
        status: llmResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const llmData = await llmResponse.json();

    return new Response(JSON.stringify(llmData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-tree function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
