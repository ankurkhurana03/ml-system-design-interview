import type { MLStage, TreeNode, Problem } from '@/types/tree';

/**
 * Scaffold-first tree generation.
 *
 * Generates a structurally valid Problem skeleton (IDs, stages, types,
 * next references all pre-wired) with placeholder content.  The LLM
 * then only needs to fill in labels, content, and choice answers —
 * the part it's good at — while the structure is guaranteed correct.
 */

const STAGES: MLStage[] = [
  'problem_definition',
  'metrics',
  'data',
  'features',
  'model',
  'training',
  'deployment',
  'monitoring',
];

const STAGE_ABBREV: Record<MLStage, string> = {
  problem_definition: 'pd',
  metrics: 'met',
  data: 'dat',
  features: 'feat',
  model: 'mod',
  training: 'train',
  deployment: 'deploy',
  monitoring: 'mon',
};

interface ScaffoldOptions {
  title: string;
  description: string;
  /** Number of branching question nodes (1-3). Default 2. */
  numBranches?: number;
  /** Which stage indices (0-7) to place branches at. Auto-selected if omitted. */
  branchStages?: number[];
}

/** A scaffold node with placeholder markers for LLM content filling. */
export interface ScaffoldNode extends TreeNode {
  /** If true, the LLM should fill label/content/choices for this node. */
  _placeholder: boolean;
}

export interface ScaffoldProblem extends Problem {
  nodes: ScaffoldNode[];
}

/**
 * Pick stage indices for branching.
 * Spreads branches across stages 0-5 (problem_definition through training).
 * Avoids deployment and monitoring since those are near the end.
 */
function pickBranchStages(numBranches: number): number[] {
  const candidates = [1, 3, 4]; // metrics, features, model — common decision points
  if (numBranches === 1) return [candidates[0]];
  if (numBranches === 2) return [candidates[0], candidates[2]];
  return candidates.slice(0, numBranches);
}

/**
 * Generate a structurally valid tree skeleton.
 *
 * The skeleton has correct IDs, stages, types, next references, and
 * placeholder content strings like "[FILL: ...]" for the LLM to replace.
 */
export function scaffoldTree(options: ScaffoldOptions): ScaffoldProblem {
  const { title, description } = options;
  const numBranches = Math.max(1, Math.min(3, options.numBranches ?? 2));
  const branchStageIndices = options.branchStages ?? pickBranchStages(numBranches);

  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const nodes: ScaffoldNode[] = [];

  // We build paths.  A "path set" is a list of path labels (e.g. ['a', 'b']).
  // We start with a single path ['main'] and split at each branch stage.
  interface PathState {
    label: string;           // e.g. 'a', 'b', 'a_x', 'a_y'
    nextIdOverride?: string; // set by the previous node in this path
  }

  let activePaths: PathState[] = [{ label: 'main' }];
  let branchCounter = 0;

  for (let stageIdx = 0; stageIdx < STAGES.length; stageIdx++) {
    const stage = STAGES[stageIdx];
    const abbrev = STAGE_ABBREV[stage];
    const isBranchStage = branchStageIndices.includes(stageIdx) && branchCounter < numBranches;
    const isLastStage = stageIdx === STAGES.length - 1;

    if (isBranchStage) {
      // At a branch stage, each active path gets a question node that splits into 2
      const newPaths: PathState[] = [];
      for (const path of activePaths) {
        const questionId = activePaths.length === 1
          ? `${abbrev}_question`
          : `${abbrev}_${path.label}_question`;

        // Two child paths
        const childA = `${path.label === 'main' ? '' : path.label + '_'}a${branchCounter}`;
        const childB = `${path.label === 'main' ? '' : path.label + '_'}b${branchCounter}`;

        const nextStage = STAGES[stageIdx + 1];
        const nextAbbrev = STAGE_ABBREV[nextStage];
        const nextIdA = `${nextAbbrev}_${childA}_1`;
        const nextIdB = `${nextAbbrev}_${childB}_1`;

        const questionNode: ScaffoldNode = {
          id: questionId,
          stage,
          type: 'question',
          label: `[FILL: ${stage} decision]`,
          speaker: 'candidate',
          content: `[FILL: Present a key design decision about ${stage.replace('_', ' ')}]`,
          choices: [
            {
              label: `[FILL: Option A for ${stage.replace('_', ' ')}]`,
              answer: `[FILL: Explain approach A with trade-offs (3-5 sentences)]`,
              next: nextIdA,
            },
            {
              label: `[FILL: Option B for ${stage.replace('_', ' ')}]`,
              answer: `[FILL: Explain approach B with trade-offs (3-5 sentences)]`,
              next: nextIdB,
            },
          ],
          _placeholder: true,
        };

        // If the previous node in this path set a next override, we need an
        // info node before the question to bridge
        if (path.nextIdOverride) {
          // The previous node already points to this question node via nextIdOverride
          questionNode.id = path.nextIdOverride;
          // Re-derive a proper ID
          const bridgeId = path.nextIdOverride;
          questionNode.id = bridgeId;
        } else if (nodes.length > 0) {
          // Hook up from previous stage's last node
          // This is handled by the info node creation below
        }

        nodes.push(questionNode);
        newPaths.push({ label: childA, nextIdOverride: nextIdA });
        newPaths.push({ label: childB, nextIdOverride: nextIdB });
      }

      activePaths = newPaths;
      branchCounter++;
    } else {
      // Non-branch stage: create one info node (or terminal) per active path
      const nextPaths: PathState[] = [];

      for (const path of activePaths) {
        const suffix = activePaths.length === 1 && path.label === 'main'
          ? '1'
          : `${path.label}_1`;
        const nodeId = path.nextIdOverride || `${abbrev}_${suffix}`;

        if (isLastStage) {
          // Terminal node
          const terminalNode: ScaffoldNode = {
            id: nodeId,
            stage,
            type: 'terminal',
            label: `[FILL: Interview summary for this path]`,
            speaker: 'interviewer',
            content: `[FILL: Summarize the design choices made in this path and their implications (3-5 sentences)]`,
            _placeholder: true,
          };
          nodes.push(terminalNode);
        } else {
          // Info node — links to next stage
          const nextStage = STAGES[stageIdx + 1];
          const nextAbbrev = STAGE_ABBREV[nextStage];
          const nextIsBranch = branchStageIndices.includes(stageIdx + 1) && branchCounter < numBranches;

          let nextId: string;
          if (nextIsBranch && activePaths.length === 1) {
            nextId = `${nextAbbrev}_question`;
          } else if (nextIsBranch) {
            nextId = `${nextAbbrev}_${path.label}_question`;
          } else {
            nextId = activePaths.length === 1 && path.label === 'main'
              ? `${nextAbbrev}_1`
              : `${nextAbbrev}_${path.label}_1`;
          }

          const speaker = stageIdx % 2 === 0 ? 'interviewer' : 'candidate';
          const infoNode: ScaffoldNode = {
            id: nodeId,
            stage,
            type: 'info',
            label: `[FILL: ${stage.replace('_', ' ')} topic]`,
            speaker: speaker as 'interviewer' | 'candidate',
            content: `[FILL: Discuss ${stage.replace('_', ' ')} considerations (50-200 words)]`,
            next: nextId,
            _placeholder: true,
          };
          nodes.push(infoNode);
          nextPaths.push({ label: path.label, nextIdOverride: nextId });
        }
      }

      if (!isLastStage) {
        activePaths = nextPaths;
      }
    }
  }

  return {
    id,
    title,
    description,
    root: nodes[0].id,
    nodes,
  };
}

export type ContentDepth = 'concise' | 'detailed';

export interface ContentFillingOptions {
  /** 'concise' for quick mode, 'detailed' for extensive mode. Default: 'concise'. */
  depth?: ContentDepth;
  /** Only include nodes in these stages. If omitted, all nodes are included. */
  stageFilter?: MLStage[];
}

/**
 * Build the LLM prompt for content-filling.
 *
 * Given a scaffold, produces a prompt that asks the LLM to return
 * ONLY a JSON array of {id, label, content, choices?} objects —
 * filling in the placeholder content while preserving the structure.
 *
 * Supports `depth` (concise vs detailed) and `stageFilter` (subset of stages).
 */
export function buildContentFillingPrompt(
  scaffold: ScaffoldProblem,
  problemDescription: string,
  options?: ContentFillingOptions,
): string {
  const depth = options?.depth ?? 'concise';
  const stageFilter = options?.stageFilter;

  let filteredNodes = scaffold.nodes;
  if (stageFilter && stageFilter.length > 0) {
    const stageSet = new Set(stageFilter);
    filteredNodes = scaffold.nodes.filter((n) => stageSet.has(n.stage));
  }

  const nodeList = filteredNodes.map((n) => {
    const base: Record<string, unknown> = {
      id: n.id,
      stage: n.stage,
      type: n.type,
      speaker: n.speaker,
    };
    if (n.type === 'question' && n.choices) {
      base.choices = n.choices.map((c) => ({
        label: c.label,
        answer: c.answer,
        next: c.next,
      }));
    }
    return base;
  });

  const contentGuidance = depth === 'detailed'
    ? `- "content": thorough educational content (100-300 words for info/terminal, 30-60 words for questions). Include Python/SQL code snippets in markdown code blocks where relevant. Provide concrete real-world examples and quantitative considerations.
- "choices": (only for question nodes) array of {label, answer} where answer is 5-8 educational sentences with technical depth, specific algorithms/techniques, and when-to-use guidance`
    : `- "content": detailed educational content (50-200 words for info/terminal, 20-50 words for questions)
- "choices": (only for question nodes) array of {label, answer} where answer is 3-5 educational sentences`;

  const stageFilterNote = stageFilter && stageFilter.length > 0
    ? `\n\nNOTE: You are filling stages: ${stageFilter.join(', ')}. Earlier stages are already filled. Maintain thematic consistency with the overall problem.`
    : '';

  return `You are an expert ML system design interviewer. Fill in the educational content for an interview decision tree about:

"${problemDescription}"

Below is the tree SKELETON with node IDs, stages, types, and structure already defined. Your job is to fill in ONLY the content. Return a JSON array where each element has:
- "id": the node ID (must match exactly)
- "label": a short descriptive label (5-15 words)
${contentGuidance}

IMPORTANT:
- Do NOT change node IDs, stages, types, or next references
- Do NOT add or remove nodes
- Make content educational: explain trade-offs, mention real-world examples
- Alternate tone: interviewer nodes should ask/explain, candidate nodes should reason/decide
- Keep labels concise for graph display

SKELETON:
${JSON.stringify(nodeList, null, 2)}

Return ONLY valid JSON array. No markdown, no explanation.${stageFilterNote}`;
}

/**
 * Merge LLM-filled content back into the scaffold.
 *
 * Takes the scaffold and the LLM's JSON response, merges content
 * while preserving the scaffold's structural integrity.
 */
export function mergeContentIntoScaffold(
  scaffold: ScaffoldProblem,
  filledContent: Array<{
    id: string;
    label?: string;
    content?: string;
    choices?: Array<{ label?: string; answer?: string }>;
  }>,
): Problem {
  const contentMap = new Map(filledContent.map((c) => [c.id, c]));

  const nodes: TreeNode[] = scaffold.nodes.map((scaffoldNode) => {
    const filled = contentMap.get(scaffoldNode.id);
    // Strip _placeholder from the output
    const { _placeholder, ...baseNode } = scaffoldNode;

    if (!filled) {
      // LLM didn't provide content for this node — use placeholder
      return baseNode;
    }

    const merged: TreeNode = {
      ...baseNode,
      label: filled.label || baseNode.label,
      content: filled.content || baseNode.content,
    };

    // Merge choice content if it's a question node
    if (merged.type === 'question' && merged.choices && filled.choices) {
      merged.choices = merged.choices.map((choice, i) => ({
        ...choice, // preserves `next` from scaffold
        label: filled.choices?.[i]?.label || choice.label,
        answer: filled.choices?.[i]?.answer || choice.answer,
      }));
    }

    return merged;
  });

  return {
    id: scaffold.id,
    title: scaffold.title,
    description: scaffold.description,
    root: scaffold.root,
    nodes,
  };
}

/**
 * Find nodes in a Problem that still have placeholder content.
 * Returns the unfilled nodes (label or content starts with "[FILL:").
 */
export function findUnfilledNodes(problem: Problem): TreeNode[] {
  return problem.nodes.filter(
    (n) => n.label.startsWith('[FILL:') || n.content.startsWith('[FILL:'),
  );
}

/**
 * Build a compact prompt to fill only the remaining unfilled nodes.
 * Much smaller than the full prompt — targets just the gaps.
 */
export function buildGapFillingPrompt(
  unfilledNodes: TreeNode[],
  problemDescription: string,
): string {
  const nodeList = unfilledNodes.map((n) => {
    const base: Record<string, unknown> = {
      id: n.id,
      stage: n.stage,
      type: n.type,
      speaker: n.speaker,
    };
    if (n.type === 'question' && n.choices) {
      base.num_choices = n.choices.length;
    }
    return base;
  });

  return `Fill in content for these ${unfilledNodes.length} nodes of an ML interview about:
"${problemDescription}"

For each node, return: {"id": "...", "label": "short label", "content": "educational content"${
    unfilledNodes.some((n) => n.type === 'question')
      ? ', "choices": [{label, answer}]'
      : ''
  }}

Nodes to fill:
${JSON.stringify(nodeList, null, 2)}

Return ONLY a JSON array. No markdown.`;
}

/**
 * Merge gap-filled content into an existing Problem.
 * Like mergeContentIntoScaffold but operates on a regular Problem.
 */
export function mergeGapContent(
  problem: Problem,
  filledContent: Array<{
    id: string;
    label?: string;
    content?: string;
    choices?: Array<{ label?: string; answer?: string }>;
  }>,
): Problem {
  const contentMap = new Map(filledContent.map((c) => [c.id, c]));

  const nodes = problem.nodes.map((node) => {
    const filled = contentMap.get(node.id);
    if (!filled) return node;

    const merged = { ...node };
    if (filled.label && !filled.label.startsWith('[FILL:')) {
      merged.label = filled.label;
    }
    if (filled.content && !filled.content.startsWith('[FILL:')) {
      merged.content = filled.content;
    }
    if (merged.type === 'question' && merged.choices && filled.choices) {
      merged.choices = merged.choices.map((choice, i) => ({
        ...choice,
        label: filled.choices?.[i]?.label || choice.label,
        answer: filled.choices?.[i]?.answer || choice.answer,
      }));
    }
    return merged;
  });

  return { ...problem, nodes };
}
