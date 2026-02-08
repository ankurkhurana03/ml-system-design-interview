#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

// ---------------------------------------------------------------------------
// Types (mirrored from src/types/tree.ts)
// ---------------------------------------------------------------------------

const ML_STAGES = [
  "problem_definition",
  "metrics",
  "data",
  "features",
  "model",
  "training",
  "deployment",
  "monitoring",
] as const;

type MLStage = (typeof ML_STAGES)[number];

const NODE_TYPES = ["info", "question", "terminal", "multi_select"] as const;
type NodeType = (typeof NODE_TYPES)[number];

const SPEAKERS = ["interviewer", "candidate"] as const;
type Speaker = (typeof SPEAKERS)[number];

interface Choice {
  label: string;
  answer: string;
  next: string;
}

interface MultiSelectRoute {
  key: string;
  next: string;
}

interface DimensionOption {
  value: string;
  label: string;
}

interface Dimension {
  id: string;
  label: string;
  description?: string;
  options: DimensionOption[];
}

interface DimensionGroup {
  id: string;
  label: string;
  dimensions: Dimension[];
}

interface DialogueLine {
  speaker: Speaker;
  text: string;
}

interface TreeNode {
  id: string;
  stage: MLStage;
  type: NodeType;
  label: string;
  speaker: Speaker;
  content: string;
  next?: string;
  choices?: Choice[];
  dimensionGroups?: DimensionGroup[];
  routes?: MultiSelectRoute[];
  defaultRoute?: string;
  dialogue?: DialogueLine[];
}

interface Problem {
  id: string;
  title: string;
  description: string;
  root: string;
  nodes: TreeNode[];
}

// ---------------------------------------------------------------------------
// Resolve the project root (parent of mcp-server/)
// ---------------------------------------------------------------------------

function getProjectRoot(): string {
  // When running as `node dist/index.js`, __dirname is mcp-server/dist
  // We need to go up two levels to reach the project root
  const distDir = path.dirname(new URL(import.meta.url).pathname);
  return path.resolve(distDir, "..", "..");
}

const PROJECT_ROOT = getProjectRoot();
const PROBLEMS_DIR = path.join(PROJECT_ROOT, "src", "data", "problems");

// ---------------------------------------------------------------------------
// Validation logic (reimplemented from src/utils/validateTree.ts)
// ---------------------------------------------------------------------------

function validateTree(problem: Problem): string[] {
  const errors: string[] = [];

  if (!problem) {
    return ["Problem object is null or undefined"];
  }

  if (!problem.id || typeof problem.id !== "string") {
    errors.push("Problem must have a valid id");
  }

  if (!problem.title || typeof problem.title !== "string") {
    errors.push("Problem must have a valid title");
  }

  if (!problem.description || typeof problem.description !== "string") {
    errors.push("Problem must have a valid description");
  }

  if (!problem.root || typeof problem.root !== "string") {
    errors.push("Problem must have a valid root node id");
  }

  if (!Array.isArray(problem.nodes) || problem.nodes.length === 0) {
    errors.push("Problem must have at least one node");
    return errors;
  }

  const nodeMap = new Map<string, TreeNode>();
  const nodeIds = new Set<string>();

  for (const node of problem.nodes) {
    if (!node.id || typeof node.id !== "string") {
      errors.push("All nodes must have a valid id");
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    } else {
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);
    }
  }

  if (!nodeMap.has(problem.root)) {
    errors.push(`Root node '${problem.root}' does not exist in nodes`);
  }

  for (const node of problem.nodes) {
    const nodePrefix = `Node '${node.id}':`;

    if (!node.stage) {
      errors.push(`${nodePrefix} must have a stage`);
    } else if (!ML_STAGES.includes(node.stage as MLStage)) {
      errors.push(
        `${nodePrefix} has invalid stage '${node.stage}'. Valid stages: ${ML_STAGES.join(", ")}`
      );
    }

    if (
      !node.type ||
      !NODE_TYPES.includes(node.type as NodeType)
    ) {
      errors.push(
        `${nodePrefix} must have a valid type (info, question, terminal, or multi_select)`
      );
    }

    if (!node.label || typeof node.label !== "string") {
      errors.push(`${nodePrefix} must have a valid label`);
    }

    if (
      !node.speaker ||
      !SPEAKERS.includes(node.speaker as Speaker)
    ) {
      errors.push(
        `${nodePrefix} must have a valid speaker (interviewer or candidate)`
      );
    }

    if (!node.content || typeof node.content !== "string") {
      errors.push(`${nodePrefix} must have valid content`);
    }

    // Dialogue validation
    if (node.dialogue !== undefined) {
      if (!Array.isArray(node.dialogue)) {
        errors.push(`${nodePrefix} dialogue must be an array`);
      } else {
        for (let i = 0; i < node.dialogue.length; i++) {
          const line = node.dialogue[i];
          if (
            !line.speaker ||
            !SPEAKERS.includes(line.speaker as Speaker)
          ) {
            errors.push(
              `${nodePrefix} dialogue line ${i}: must have a valid speaker (interviewer or candidate)`
            );
          }
          if (!line.text || typeof line.text !== "string") {
            errors.push(
              `${nodePrefix} dialogue line ${i}: must have valid text`
            );
          }
        }
      }
    }

    // Type-specific validation
    if (node.type === "info") {
      if (!node.next || typeof node.next !== "string") {
        errors.push(`${nodePrefix} info nodes must have a 'next' property`);
      } else if (!nodeMap.has(node.next)) {
        errors.push(
          `${nodePrefix} next reference '${node.next}' does not exist`
        );
      }
    }

    if (node.type === "question") {
      if (!Array.isArray(node.choices) || node.choices.length < 2) {
        errors.push(
          `${nodePrefix} question nodes must have at least 2 choices`
        );
      } else {
        for (let i = 0; i < node.choices.length; i++) {
          const choice = node.choices[i];
          const choicePrefix = `${nodePrefix} choice ${i}:`;

          if (!choice.label || typeof choice.label !== "string") {
            errors.push(`${choicePrefix} must have a valid label`);
          }
          if (!choice.answer || typeof choice.answer !== "string") {
            errors.push(`${choicePrefix} must have a valid answer`);
          }
          if (!choice.next || typeof choice.next !== "string") {
            errors.push(`${choicePrefix} must have a valid next reference`);
          } else if (!nodeMap.has(choice.next)) {
            errors.push(
              `${choicePrefix} next reference '${choice.next}' does not exist`
            );
          }
        }
      }
    }

    if (node.type === "terminal") {
      if (node.next) {
        errors.push(
          `${nodePrefix} terminal nodes should not have a 'next' property`
        );
      }
      if (node.choices && node.choices.length > 0) {
        errors.push(`${nodePrefix} terminal nodes should not have choices`);
      }
    }

    if (node.type === "multi_select") {
      if (!node.dimensionGroups || node.dimensionGroups.length === 0) {
        errors.push(
          `${nodePrefix} multi_select nodes must have at least 1 dimension group`
        );
      } else {
        for (const group of node.dimensionGroups) {
          if (!group.dimensions || group.dimensions.length === 0) {
            errors.push(
              `${nodePrefix} dimension group '${group.id}' must have at least 1 dimension`
            );
          } else {
            for (const dim of group.dimensions) {
              if (!dim.options || dim.options.length < 2) {
                errors.push(
                  `${nodePrefix} dimension '${dim.id}' must have at least 2 options`
                );
              }
            }
          }
        }
      }

      if (!node.defaultRoute && (!node.routes || node.routes.length === 0)) {
        errors.push(
          `${nodePrefix} multi_select nodes must have routes or a defaultRoute`
        );
      }

      if (node.routes) {
        for (const route of node.routes) {
          if (!nodeMap.has(route.next)) {
            errors.push(
              `${nodePrefix} route '${route.key}' next reference '${route.next}' does not exist`
            );
          }
        }
      }

      if (node.defaultRoute && !nodeMap.has(node.defaultRoute)) {
        errors.push(
          `${nodePrefix} defaultRoute '${node.defaultRoute}' does not exist`
        );
      }
    }
  }

  // Check for orphan nodes
  if (nodeMap.has(problem.root)) {
    const reachable = new Set<string>();
    const queue: string[] = [problem.root];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      reachable.add(currentId);

      const node = nodeMap.get(currentId);
      if (!node) continue;

      if (node.type === "info" && node.next) {
        queue.push(node.next);
      } else if (node.type === "question" && node.choices) {
        for (const choice of node.choices) {
          if (choice.next) queue.push(choice.next);
        }
      } else if (node.type === "multi_select") {
        if (node.routes) {
          for (const route of node.routes) {
            if (route.next) queue.push(route.next);
          }
        }
        if (node.defaultRoute) queue.push(node.defaultRoute);
      }
    }

    for (const nodeId of nodeIds) {
      if (!reachable.has(nodeId)) {
        errors.push(`Node '${nodeId}' is unreachable from root`);
      }
    }
  }

  // Cycle detection
  if (nodeMap.has(problem.root)) {
    if (detectCycle(problem.root, nodeMap)) {
      errors.push("Warning: Tree contains cycles");
    }
  }

  return errors;
}

function detectCycle(
  rootId: string,
  nodeMap: Map<string, TreeNode>
): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      recStack.delete(nodeId);
      return false;
    }

    const children: string[] = [];
    if (node.type === "info" && node.next) {
      children.push(node.next);
    } else if (node.type === "question" && node.choices) {
      children.push(...node.choices.map((c) => c.next));
    } else if (node.type === "multi_select") {
      if (node.routes) children.push(...node.routes.map((r) => r.next));
      if (node.defaultRoute) children.push(node.defaultRoute);
    }

    for (const childId of children) {
      if (dfs(childId)) return true;
    }

    recStack.delete(nodeId);
    return false;
  }

  return dfs(rootId);
}

// ---------------------------------------------------------------------------
// Stage alias mapping for repair_nodes
// ---------------------------------------------------------------------------

const STAGE_ALIASES: Record<string, MLStage> = {
  problem_formulation: "problem_definition",
  problem: "problem_definition",
  problem_def: "problem_definition",
  definition: "problem_definition",
  metric: "metrics",
  evaluation_metrics: "metrics",
  evaluation: "metrics",
  dataset: "data",
  data_collection: "data",
  data_engineering: "data",
  feature: "features",
  feature_engineering: "features",
  feature_selection: "features",
  modeling: "model",
  model_selection: "model",
  model_architecture: "model",
  train: "training",
  training_pipeline: "training",
  optimization: "training",
  deploy: "deployment",
  serving: "deployment",
  inference: "deployment",
  monitor: "monitoring",
  observability: "monitoring",
  maintenance: "monitoring",
};

function resolveStage(raw: string): MLStage | null {
  const lower = raw.toLowerCase().trim();
  if (ML_STAGES.includes(lower as MLStage)) return lower as MLStage;
  return STAGE_ALIASES[lower] ?? null;
}

// ---------------------------------------------------------------------------
// repair_nodes logic
// ---------------------------------------------------------------------------

function repairNodes(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  const repaired: Record<string, unknown>[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = { ...nodes[i] };
    const isLast = i === nodes.length - 1;

    // Fix stage
    if (node.stage && typeof node.stage === "string") {
      const resolved = resolveStage(node.stage);
      if (resolved) {
        node.stage = resolved;
      }
    }

    // Fix type
    if (!node.type || !NODE_TYPES.includes(node.type as NodeType)) {
      if (isLast) {
        node.type = "terminal";
      } else {
        node.type = "info";
      }
    }

    // Question nodes with <2 choices -> convert to info
    if (node.type === "question") {
      const choices = node.choices as Choice[] | undefined;
      if (!choices || !Array.isArray(choices) || choices.length < 2) {
        node.type = "info";
        delete node.choices;
      }
    }

    // Missing speaker -> default to interviewer
    if (
      !node.speaker ||
      !SPEAKERS.includes(node.speaker as Speaker)
    ) {
      node.speaker = "interviewer";
    }

    // Missing content/label coercion
    if (!node.label && node.content && typeof node.content === "string") {
      node.label = (node.content as string).slice(0, 80);
    }
    if (!node.content && node.label && typeof node.label === "string") {
      node.content = node.label;
    }
    if (!node.label) {
      node.label = `Node ${node.id || i}`;
    }
    if (!node.content) {
      node.content = node.label;
    }

    // Terminal nodes must not have next/choices
    if (node.type === "terminal") {
      delete node.next;
      delete node.choices;
    }

    // Info nodes without next -> point to next node in array
    if (node.type === "info" && !node.next && !isLast) {
      const nextNode = nodes[i + 1];
      if (nextNode && nextNode.id) {
        node.next = nextNode.id;
      }
    }

    repaired.push(node);
  }

  return repaired;
}

// ---------------------------------------------------------------------------
// scaffold logic
// ---------------------------------------------------------------------------

function scaffold(
  title: string,
  description: string,
  numBranches: number
): string {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const stages = [...ML_STAGES];
  numBranches = Math.max(1, Math.min(numBranches, 4));

  // Decide which stages get branching questions.
  // Spread them across the first half of stages for maximum divergence.
  const branchStageIndices: number[] = [];
  if (numBranches === 1) {
    branchStageIndices.push(0); // problem_definition
  } else if (numBranches === 2) {
    branchStageIndices.push(0, 2); // problem_definition, data
  } else if (numBranches === 3) {
    branchStageIndices.push(0, 2, 4); // problem_definition, data, model
  } else {
    branchStageIndices.push(0, 1, 2, 4);
  }

  interface NodeDef {
    id: string;
    stage: string;
    type: string;
    label: string;
    speaker: string;
    content: string;
    next?: string;
    choices?: { label: string; answer: string; next: string }[];
  }

  const nodes: NodeDef[] = [];
  const branchLabels = ["a", "b", "c", "d"];

  // We build paths. Initially 1 path, branching at designated stages.
  // Each path tracks its current "branch suffix" like "", "_a", "_b", "_a_a", etc.
  interface PathState {
    suffix: string;
    startStageIndex: number;
  }

  let activePaths: PathState[] = [{ suffix: "", startStageIndex: 0 }];
  let branchCount = 0;

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    const newPaths: PathState[] = [];

    for (const pathState of activePaths) {
      if (stageIdx < pathState.startStageIndex) {
        newPaths.push(pathState);
        continue;
      }

      const prefix = `${stage}${pathState.suffix}`;

      if (
        branchStageIndices.includes(stageIdx) &&
        branchCount < numBranches &&
        stageIdx === branchStageIndices[branchCount]
      ) {
        // Add an intro info node for this stage
        const infoId = `${prefix}_1`;
        const questionId = `${prefix}_2`;

        nodes.push({
          id: infoId,
          stage,
          type: "info",
          label: `[FILL: ${stage.replace(/_/g, " ")} overview]`,
          speaker: "interviewer",
          content: `[FILL: Describe the ${stage.replace(/_/g, " ")} context]`,
          next: questionId,
        });

        // Add branching question node
        const nextStageIdx = stageIdx + 1;
        const nextStage =
          nextStageIdx < stages.length ? stages[nextStageIdx] : null;

        const choices: { label: string; answer: string; next: string }[] = [];
        for (let c = 0; c < 2; c++) {
          const branchSuffix = `${pathState.suffix}_${branchLabels[c]}`;
          const nextNodeId = nextStage
            ? `${nextStage}${branchSuffix}_1`
            : `monitoring${branchSuffix}_terminal`;

          choices.push({
            label: `[FILL: Option ${branchLabels[c].toUpperCase()}]`,
            answer: `[FILL: Explanation for option ${branchLabels[c].toUpperCase()}]`,
            next: nextNodeId,
          });

          newPaths.push({
            suffix: branchSuffix,
            startStageIndex: stageIdx + 1,
          });
        }

        nodes.push({
          id: questionId,
          stage,
          type: "question",
          label: `[FILL: Key decision question]`,
          speaker: "candidate",
          content: `[FILL: Decision question for ${stage.replace(/_/g, " ")}]`,
          choices,
        });

        // Mark this branch as used (only for active paths with empty suffix initially)
        if (pathState.suffix === "" || branchCount < numBranches) {
          // handled via branchCount below
        }
      } else {
        // Linear info node (or terminal for monitoring)
        const nodeId = `${prefix}_1`;

        if (stage === "monitoring") {
          // Terminal node
          nodes.push({
            id: `${prefix}_terminal`,
            stage,
            type: "terminal",
            label: `[FILL: Interview conclusion${pathState.suffix ? " (path " + pathState.suffix.replace(/_/g, " ").trim() + ")" : ""}]`,
            speaker: "interviewer",
            content: `[FILL: Summary and closing remarks]`,
          });
        } else {
          // Info node pointing to next stage
          const nextStageIdx = stageIdx + 1;
          const nextStage = stages[nextStageIdx];
          const nextNodeId = nextStage === "monitoring"
            ? `${nextStage}${pathState.suffix}_terminal`
            : `${nextStage}${pathState.suffix}_1`;

          // Check if next stage has a branch point for this path
          const nextStageBranchIdx = branchStageIndices.indexOf(nextStageIdx);
          let actualNextId = nextNodeId;
          if (
            nextStageBranchIdx !== -1 &&
            nextStageBranchIdx < numBranches &&
            pathState.suffix === ""
          ) {
            actualNextId = `${nextStage}${pathState.suffix}_1`;
          }

          nodes.push({
            id: nodeId,
            stage,
            type: "info",
            label: `[FILL: ${stage.replace(/_/g, " ")} details]`,
            speaker: "interviewer",
            content: `[FILL: Discuss ${stage.replace(/_/g, " ")} considerations]`,
            next: actualNextId,
          });
        }

        newPaths.push(pathState);
      }
    }

    // Advance branch count if this stage had a branch
    if (
      branchStageIndices.includes(stageIdx) &&
      branchCount < numBranches &&
      stageIdx === branchStageIndices[branchCount]
    ) {
      branchCount++;
    }

    activePaths = newPaths;
  }

  // Find root
  const rootId = nodes.length > 0 ? nodes[0].id : "start";

  const problem = {
    id,
    title,
    description: description || "[FILL: Problem description]",
    root: rootId,
    nodes,
  };

  return YAML.stringify(problem, { lineWidth: 120 });
}

// ---------------------------------------------------------------------------
// check_references logic
// ---------------------------------------------------------------------------

function checkReferences(yamlStr: string): string {
  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlStr);
  } catch (e) {
    return `YAML parse error: ${(e as Error).message}`;
  }

  const problem = parsed as Problem;
  if (!problem.nodes || !Array.isArray(problem.nodes)) {
    return "Error: No 'nodes' array found in YAML";
  }

  const nodeIds = new Set<string>();
  for (const node of problem.nodes) {
    if (node.id) nodeIds.add(node.id);
  }

  const broken: string[] = [];

  for (const node of problem.nodes) {
    if (node.type === "info" && node.next) {
      if (!nodeIds.has(node.next)) {
        broken.push(`Node '${node.id}': next reference '${node.next}' does not exist`);
      }
    }

    if (node.type === "question" && node.choices) {
      for (let i = 0; i < node.choices.length; i++) {
        const choice = node.choices[i];
        if (choice.next && !nodeIds.has(choice.next)) {
          broken.push(
            `Node '${node.id}' choice ${i} ('${choice.label}'): next reference '${choice.next}' does not exist`
          );
        }
      }
    }

    if (node.type === "multi_select") {
      if (node.routes) {
        for (const route of node.routes) {
          if (route.next && !nodeIds.has(route.next)) {
            broken.push(
              `Node '${node.id}' route '${route.key}': next reference '${route.next}' does not exist`
            );
          }
        }
      }
      if (node.defaultRoute && !nodeIds.has(node.defaultRoute)) {
        broken.push(
          `Node '${node.id}': defaultRoute '${node.defaultRoute}' does not exist`
        );
      }
    }
  }

  // Also check root reference
  if (problem.root && !nodeIds.has(problem.root)) {
    broken.push(`Root reference '${problem.root}' does not exist in nodes`);
  }

  if (broken.length === 0) {
    return "All references valid";
  }

  return `Found ${broken.length} broken reference(s):\n\n${broken.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Schema text for get_schema tool
// ---------------------------------------------------------------------------

const SCHEMA_TEXT = `# ML System Design Interview Tool - Tree Schema

## MLStage (8 stages in order)
type MLStage =
  | 'problem_definition'  // Stage 1 - blue-500
  | 'metrics'             // Stage 2 - purple-500
  | 'data'                // Stage 3 - green-500
  | 'features'            // Stage 4 - amber-500
  | 'model'               // Stage 5 - red-500
  | 'training'            // Stage 6 - orange-500
  | 'deployment'          // Stage 7 - cyan-500
  | 'monitoring'          // Stage 8 - pink-500

## NodeType
type NodeType = 'info' | 'question' | 'terminal' | 'multi_select'

## Speaker
type Speaker = 'interviewer' | 'candidate'

## Choice (for question nodes)
interface Choice {
  label: string;    // Short label shown on buttons
  answer: string;   // Detailed explanation when selected
  next: string;     // ID of the next node to navigate to
}

## DimensionGroup / Dimension (for multi_select nodes)
interface DimensionGroup {
  id: string;
  label: string;
  dimensions: Dimension[];
}
interface Dimension {
  id: string;
  label: string;
  description?: string;
  options: { value: string; label: string }[];
}

## MultiSelectRoute (for multi_select nodes)
interface MultiSelectRoute {
  key: string;    // pipe-delimited combo: "real_time|large|online"
  next: string;   // target node ID
}

## DialogueLine (optional, for tutor/mock interview modes)
interface DialogueLine {
  speaker: Speaker;
  text: string;
}

## TreeNode
interface TreeNode {
  id: string;                           // Unique node identifier
  stage: MLStage;                       // Which interview stage
  type: NodeType;                       // Node behavior type
  label: string;                        // Short display label
  speaker: Speaker;                     // Who is "speaking" this node
  content: string;                      // Main text content (supports markdown)
  next?: string;                        // For info nodes: next node ID
  choices?: Choice[];                   // For question nodes: branching choices
  dimensionGroups?: DimensionGroup[];   // For multi_select nodes
  routes?: MultiSelectRoute[];          // For multi_select nodes
  defaultRoute?: string;               // Fallback route for multi_select
  dialogue?: DialogueLine[];           // Optional dialogue script
}

## Problem (top-level)
interface Problem {
  id: string;           // Kebab-case identifier (e.g., "flight-delay")
  title: string;        // Human-readable title
  description: string;  // Brief description of the problem
  root: string;         // ID of the root/starting node
  nodes: TreeNode[];    // All nodes in the tree
}

## Validation Rules Summary
1. Problem must have: id, title, description, root, nodes (non-empty array)
2. root must reference an existing node ID
3. No duplicate node IDs
4. Every node must have: id, stage (valid MLStage), type (valid NodeType), label, speaker, content
5. info nodes: must have 'next' pointing to existing node
6. question nodes: must have 2+ choices, each with label, answer, and valid next reference
7. terminal nodes: must NOT have 'next' or 'choices'
8. multi_select nodes: must have dimensionGroups (1+ groups, each with 1+ dimensions with 2+ options), and routes or defaultRoute
9. All nodes must be reachable from root (no orphans)
10. No cycles allowed (warning)
11. dialogue (if present): must be array of {speaker, text}

## YAML Format
Files are stored as .yaml in src/data/problems/. The YAML structure directly mirrors the Problem interface.
`;

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "ml-sys-design-tree-tools",
  version: "1.0.0",
});

// Tool 1: get_schema
server.tool(
  "get_schema",
  "Returns the complete TypeScript interfaces, types, and validation rules for ML System Design decision trees",
  {},
  async () => {
    return {
      content: [{ type: "text", text: SCHEMA_TEXT }],
    };
  }
);

// Tool 2: get_example
server.tool(
  "get_example",
  "Returns an example YAML decision tree file. Use problem_id='list' to see available problems.",
  {
    problem_id: z
      .string()
      .describe(
        "Problem ID (e.g., 'flight-delay') or 'list' to see available files"
      ),
  },
  async ({ problem_id }) => {
    if (problem_id === "list") {
      try {
        const files = fs
          .readdirSync(PROBLEMS_DIR)
          .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
        if (files.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No YAML files found in ${PROBLEMS_DIR}`,
              },
            ],
          };
        }
        const ids = files.map((f) => f.replace(/\.ya?ml$/, ""));
        return {
          content: [
            {
              type: "text",
              text: `Available problem files:\n\n${ids.map((id) => `- ${id}`).join("\n")}\n\nUse get_example with one of these IDs to see the file content.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading problems directory: ${(e as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Try .yaml first, then .yml
    const yamlPath = path.join(PROBLEMS_DIR, `${problem_id}.yaml`);
    const ymlPath = path.join(PROBLEMS_DIR, `${problem_id}.yml`);

    let filePath: string;
    if (fs.existsSync(yamlPath)) {
      filePath = yamlPath;
    } else if (fs.existsSync(ymlPath)) {
      filePath = ymlPath;
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Problem '${problem_id}' not found. Use problem_id='list' to see available files.`,
          },
        ],
        isError: true,
      };
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        content: [
          {
            type: "text",
            text: `# ${problem_id}.yaml\n\n\`\`\`yaml\n${content}\n\`\`\``,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: validate_tree
server.tool(
  "validate_tree",
  "Validates a YAML decision tree against all structural rules. Returns errors or 'Valid'.",
  {
    yaml: z.string().describe("Complete YAML string of the decision tree to validate"),
  },
  async ({ yaml: yamlStr }) => {
    let parsed: unknown;
    try {
      parsed = YAML.parse(yamlStr);
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `YAML parse error: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }

    const problem = parsed as Problem;
    const errors = validateTree(problem);

    if (errors.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Valid -- No errors found. The tree passes all validation checks.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Found ${errors.length} validation error(s):\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
        },
      ],
    };
  }
);

// Tool 4: repair_nodes
server.tool(
  "repair_nodes",
  "Repairs common LLM output issues in a YAML array of tree nodes (bad stages, types, missing fields, etc.)",
  {
    yaml: z
      .string()
      .describe(
        "YAML string containing an array of tree nodes (or a full Problem object with nodes)"
      ),
  },
  async ({ yaml: yamlStr }) => {
    let parsed: unknown;
    try {
      parsed = YAML.parse(yamlStr);
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `YAML parse error: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }

    // Accept either a raw array of nodes or a Problem object with a nodes field
    let nodes: Record<string, unknown>[];
    let wasProblemObject = false;
    let problemShell: Record<string, unknown> | null = null;

    if (Array.isArray(parsed)) {
      nodes = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Record<string, unknown>).nodes)
    ) {
      wasProblemObject = true;
      problemShell = { ...(parsed as Record<string, unknown>) };
      nodes = (parsed as Record<string, unknown>).nodes as Record<string, unknown>[];
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Error: Expected a YAML array of nodes or a Problem object with a 'nodes' array",
          },
        ],
        isError: true,
      };
    }

    const repaired = repairNodes(nodes);

    let output: unknown;
    if (wasProblemObject && problemShell) {
      problemShell.nodes = repaired;
      output = problemShell;
    } else {
      output = repaired;
    }

    const repairedYaml = YAML.stringify(output, { lineWidth: 120 });

    return {
      content: [
        {
          type: "text",
          text: `Repaired YAML:\n\n\`\`\`yaml\n${repairedYaml}\`\`\``,
        },
      ],
    };
  }
);

// Tool 5: scaffold
server.tool(
  "scaffold",
  "Generates a skeleton YAML decision tree covering all 8 ML stages with branching points and placeholder content",
  {
    title: z.string().describe("Title of the ML design problem (e.g., 'Fraud Detection')"),
    description: z
      .string()
      .describe("Brief description of the problem")
      .default("[FILL: Problem description]"),
    num_branches: z
      .number()
      .int()
      .min(1)
      .max(4)
      .describe("Number of branching question nodes (1-4)")
      .default(2),
  },
  async ({ title, description, num_branches }) => {
    const yamlOutput = scaffold(title, description, num_branches);

    return {
      content: [
        {
          type: "text",
          text: `Generated scaffold for "${title}" with ${num_branches} branch(es):\n\n\`\`\`yaml\n${yamlOutput}\`\`\``,
        },
      ],
    };
  }
);

// Tool 6: check_references
server.tool(
  "check_references",
  "Quick check: verifies all 'next' references in a YAML tree point to existing node IDs",
  {
    yaml: z.string().describe("Complete YAML string of the decision tree to check"),
  },
  async ({ yaml: yamlStr }) => {
    const result = checkReferences(yamlStr);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
