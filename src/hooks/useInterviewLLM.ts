import { useState, useCallback } from 'react';
import { parse } from 'yaml';
import { callLLM, callLLMWithCitations } from '@/utils/llmClient';
import { injectSourcesIntoPrompt } from '@/utils/sourceInjection';
import type { TreeNode, Choice, InterviewLLMResponse, DialogueLine, MLStage, UserSource } from '@/types/tree';

interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface ClassifyParams {
  userText: string;
  nodeLabel: string;
  nodeContent: string;
  nodeStage: string;
  choices: Choice[];
  conversationHistory: ConversationEntry[];
  problemTitle: string;
  sources?: UserSource[];
}

interface GenerateBranchParams {
  choiceLabel: string;
  choiceAnswer: string;
  targetNodeId: string;
  targetNodeStage: string;
  problemTitle: string;
  existingYaml: string;
  downstreamContext?: Array<{ id: string; label: string; stage: string; type: string }>;
  sources?: UserSource[];
}

function tryParseJSON(str: string): Record<string, unknown> | null {
  const trimmed = str.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try fixing truncated JSON by closing open strings/objects
    let fixed = trimmed;
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    if (!fixed.endsWith('}')) fixed += '}';
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function parseClassifyResponse(raw: string): InterviewLLMResponse {
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = raw.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : raw;

  const parsed = tryParseJSON(jsonStr);
  if (parsed) {
    const intent = parsed.intent as string;
    if (intent === 'match_choice' || intent === 'clarification' || intent === 'novel_answer') {
      return {
        intent,
        matchedChoiceIndex: (parsed.matchedChoiceIndex ?? parsed.matched_choice_index) as number | undefined,
        interviewerReply: (parsed.interviewerReply || parsed.interviewer_reply || '') as string,
        choiceLabel: (parsed.choiceLabel || parsed.choice_label) as string | undefined,
        choiceAnswer: (parsed.choiceAnswer || parsed.choice_answer) as string | undefined,
      };
    }
  }

  // Fallback: treat the whole response as a clarification
  console.warn('[InterviewLLM] Failed to parse classification JSON, raw:', raw.substring(0, 500));
  return {
    intent: 'clarification',
    interviewerReply: raw.trim(),
  };
}

// --- Post-processing: repair common LLM output issues ---

const VALID_STAGES: MLStage[] = [
  'problem_definition', 'metrics', 'data', 'features',
  'model', 'training', 'deployment', 'monitoring',
];

const STAGE_ALIASES: Record<string, MLStage> = {
  problem_formulation: 'problem_definition',
  problem: 'problem_definition',
  definition: 'problem_definition',
  metric: 'metrics',
  evaluation: 'metrics',
  evaluation_metrics: 'metrics',
  dataset: 'data',
  data_collection: 'data',
  data_processing: 'data',
  data_pipeline: 'data',
  feature: 'features',
  feature_engineering: 'features',
  feature_selection: 'features',
  modeling: 'model',
  model_selection: 'model',
  model_design: 'model',
  architecture: 'model',
  train: 'training',
  training_pipeline: 'training',
  optimization: 'training',
  deploy: 'deployment',
  serving: 'deployment',
  inference: 'deployment',
  monitor: 'monitoring',
  observability: 'monitoring',
  maintenance: 'monitoring',
};

const VALID_TYPES = new Set(['info', 'question', 'terminal']);

export function repairStage(raw: string): MLStage {
  const lower = raw?.toLowerCase().trim();
  if (!lower) {
    console.warn(`[repairNodes] Empty stage, defaulting to monitoring`);
    return 'monitoring';
  }
  if (VALID_STAGES.includes(lower as MLStage)) return lower as MLStage;
  if (STAGE_ALIASES[lower]) return STAGE_ALIASES[lower];

  // Fuzzy: find the valid stage that is a substring or shares the most prefix
  for (const valid of VALID_STAGES) {
    if (lower.includes(valid) || valid.includes(lower)) return valid;
  }

  console.warn(`[repairNodes] Unknown stage "${raw}", defaulting to monitoring`);
  return 'monitoring';
}

export function repairNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node, idx) => {
    const repaired = { ...node };

    // Fix stage
    repaired.stage = repairStage(node.stage);

    // Fix type
    if (!VALID_TYPES.has(node.type)) {
      repaired.type = idx === nodes.length - 1 ? 'terminal' : 'info';
      console.warn(`[repairNodes] Invalid type "${node.type}" on ${node.id}, set to "${repaired.type}"`);
    }

    // Fix speaker
    if (node.speaker !== 'interviewer' && node.speaker !== 'candidate') {
      repaired.speaker = 'interviewer';
    }

    // Ensure content is a string
    if (typeof repaired.content !== 'string') {
      repaired.content = String(repaired.content || repaired.label || '');
    }

    // Ensure label is a string
    if (typeof repaired.label !== 'string') {
      repaired.label = String(repaired.label || repaired.id || 'Untitled');
    }

    // Fix question nodes: must have at least 2 choices, else convert to info
    if (repaired.type === 'question') {
      if (!repaired.choices || repaired.choices.length < 2) {
        console.warn(`[repairNodes] Question node "${node.id}" has ${repaired.choices?.length ?? 0} choices, converting to info`);
        repaired.type = 'info';
        delete repaired.choices;
      } else {
        repaired.choices = repaired.choices.map((c: Choice) => ({
          label: String(c.label || 'Option'),
          answer: String(c.answer || ''),
          next: String(c.next || ''),
        }));
      }
    }

    // Terminal nodes should not have `next`
    if (repaired.type === 'terminal') {
      delete repaired.next;
      delete repaired.choices;
    }

    // Info nodes need `next`; if missing and not last, point to next node
    if (repaired.type === 'info' && !repaired.next && idx < nodes.length - 1) {
      repaired.next = nodes[idx + 1].id;
    }

    return repaired;
  });
}

export function useInterviewLLM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classifyAndRespond = useCallback(
    async (params: ClassifyParams): Promise<InterviewLLMResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const choiceList = params.choices
          .map((c, i) => `  ${i}: "${c.label}"`)
          .join('\n');

        const systemPrompt = `You are an expert ML system design interviewer conducting a live interview.

Current interview context:
- Problem: ${params.problemTitle}
- Stage: ${params.nodeStage}
- Current question: ${params.nodeLabel}
- Question details: ${params.nodeContent.substring(0, 300)}

Available choices the candidate can pick:
${choiceList}

Your task: Classify the candidate's response and reply as the interviewer.

CLASSIFICATION RULES:
1. "match_choice" — The candidate's answer clearly maps to one of the existing choices. Set matchedChoiceIndex to the 0-based index.
2. "clarification" — The candidate ONLY asked a question or requested more info. They did NOT propose a specific approach.
3. "novel_answer" — The candidate proposed a specific approach, technique, or method that doesn't match any existing choice. Even if the answer is unusual or unconventional, if they proposed a concrete approach, classify as novel_answer. Examples: suggesting a different algorithm, a different ML formulation, a different architecture.

RESPONSE FORMAT — Return ONLY valid JSON, no markdown:
{
  "intent": "match_choice" | "clarification" | "novel_answer",
  "matchedChoiceIndex": <number, only for match_choice>,
  "interviewerReply": "<your response as the interviewer, 1-3 sentences>",
  "choiceLabel": "<short label for the new choice, only for novel_answer>",
  "choiceAnswer": "<brief explanation of the candidate's approach, only for novel_answer>"
}

Stay in character as a professional but friendly interviewer. Keep replies concise.`;

        const finalSystemPrompt = params.sources && params.sources.length > 0
          ? injectSourcesIntoPrompt(systemPrompt, params.sources)
          : systemPrompt;

        // Limit conversation history to last 6 entries to fit within model context window
        const recentHistory = params.conversationHistory.slice(-6);
        const conversationHistory = recentHistory.map((e) => ({
          role: e.role,
          content: e.content,
        }));

        const raw = await callLLM({
          systemPrompt: finalSystemPrompt,
          userMessage: params.userText + ' /no_think',
          conversationHistory,
          maxTokens: 2000,
        });
        console.log('[InterviewLLM] Classification raw response:', raw.substring(0, 500));
        const result = parseClassifyResponse(raw);
        console.log('[InterviewLLM] Parsed intent:', result.intent);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to classify response';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const generateBranch = useCallback(
    async (params: GenerateBranchParams): Promise<TreeNode[]> => {
      let convergenceBlock = '';
      if (params.downstreamContext && params.downstreamContext.length > 0) {
        const nodeList = params.downstreamContext
          .map(n => `  ${n.id}: [${n.stage}] ${n.label} (${n.type})`)
          .join('\n');
        convergenceBlock = `

CONVERGENCE RULES:
- You may reference EXISTING node IDs in your "next" fields if the new path logically converges with existing content.
- Available downstream nodes you can converge to:
${nodeList}
- Only converge if the topics genuinely align. Don't force convergence.
- If converging, your last new node should use the existing node's ID as its "next".
- If no convergence makes sense, end with a new terminal node as before.`;
      }

      const systemPrompt = `You are an expert ML system design interviewer. Generate NEW branch nodes to extend an existing decision tree.

RULES:
1. Generate ONLY new nodes (not the entire tree)
2. Use unique IDs with a "gen_" prefix (e.g., "gen_data_1")
3. Continue from the target node's stage through remaining stages
4. End with a terminal node in the monitoring stage
5. Output ONLY a YAML array of nodes
6. VALID STAGES (use ONLY these exact strings): problem_definition, metrics, data, features, model, training, deployment, monitoring
7. VALID TYPES: info, question, terminal${convergenceBlock}

YAML FORMAT:
\`\`\`yaml
- id: gen_data_1
  stage: data
  type: info
  label: Data Strategy
  speaker: interviewer
  content: "..."
  next: gen_features_1
- id: gen_features_1
  stage: features
  type: question
  label: Feature Selection
  speaker: candidate
  content: "..."
  choices:
    - label: Option A
      answer: "..."
      next: gen_model_1
    - label: Option B
      answer: "..."
      next: gen_model_1
\`\`\``;

      const userMessage = `Existing tree context:
Problem: ${params.problemTitle}
Target node ID: ${params.targetNodeId}
Target node stage: ${params.targetNodeStage}
New choice: ${params.choiceLabel}
Candidate's approach: ${params.choiceAnswer}

Generate a branch of 3-6 nodes exploring this approach, continuing through remaining ML stages to a terminal node. Output ONLY the YAML array. /no_think`;

      const finalBranchPrompt = params.sources && params.sources.length > 0
        ? injectSourcesIntoPrompt(systemPrompt, params.sources)
        : systemPrompt;

      const response = await callLLMWithCitations({
        systemPrompt: finalBranchPrompt,
        userMessage,
        maxTokens: 4096,
      });
      console.log('[InterviewLLM] Branch generation raw response:', response.content.substring(0, 1000));

      // Extract YAML
      const yamlBlockMatch = response.content.match(/```ya?ml\n([\s\S]*?)\n```/);
      const codeBlockMatch = response.content.match(/```\n([\s\S]*?)\n```/);
      const yamlStr = yamlBlockMatch?.[1] || codeBlockMatch?.[1] || response.content;

      const parsed = parse(yamlStr);
      console.log('[InterviewLLM] Parsed nodes count:', Array.isArray(parsed) ? parsed.length : 'not array');
      let nodes: TreeNode[];

      if (Array.isArray(parsed)) {
        nodes = parsed;
      } else if (parsed?.nodes && Array.isArray(parsed.nodes)) {
        nodes = parsed.nodes;
      } else {
        throw new Error('Expected YAML array of nodes from LLM');
      }

      if (nodes.length === 0) {
        throw new Error('No nodes generated');
      }

      // Repair common LLM output issues (invalid stages, missing fields, etc.)
      const repaired = repairNodes(nodes);

      // Attach citations from the LLM response to the first node
      if (response.citations && response.citations.length > 0 && repaired.length > 0) {
        repaired[0].citations = response.citations;
      }

      console.log('[InterviewLLM] Repaired nodes:', repaired.map(n => `${n.id}[${n.stage}/${n.type}]`).join(', '));

      return repaired;
    },
    [],
  );

  return { classifyAndRespond, generateBranch, loading, error };
}

// Build conversation history from dialogue lines
export function dialogueToConversation(lines: DialogueLine[]): ConversationEntry[] {
  return lines.map((line) => ({
    role: line.speaker === 'candidate' ? ('user' as const) : ('assistant' as const),
    content: line.text,
  }));
}
