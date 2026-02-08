// src/types/tree.ts

// The 8 ML system design interview stages
export type MLStage =
  | 'problem_definition'
  | 'metrics'
  | 'data'
  | 'features'
  | 'model'
  | 'training'
  | 'deployment'
  | 'monitoring';

export type NodeType = 'info' | 'question' | 'terminal' | 'multi_select';
export type Speaker = 'interviewer' | 'candidate';
export type TTSProvider = 'browser' | 'kokoro';

export interface DialogueLine {
  speaker: Speaker;
  text: string;
}

export interface Choice {
  label: string;
  answer: string;
  next: string;
}

export interface DimensionGroup {
  id: string;
  label: string;
  dimensions: Dimension[];
}

export interface Dimension {
  id: string;
  label: string;
  description?: string;
  options: { value: string; label: string }[];
}

export interface MultiSelectRoute {
  key: string;   // pipe-delimited: "real_time|large|online"
  next: string;  // target node ID
}

export interface TreeNode {
  id: string;
  stage: MLStage;
  type: NodeType;
  label: string;
  speaker: Speaker;
  content: string;
  next?: string;                      // For info nodes
  choices?: Choice[];                 // For question nodes
  dimensionGroups?: DimensionGroup[]; // For multi_select nodes
  routes?: MultiSelectRoute[];       // For multi_select nodes
  defaultRoute?: string;             // Fallback target for multi_select
  dialogue?: DialogueLine[];         // Optional dialogue for tutor/mock modes
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  root: string;
  nodes: TreeNode[];
}

export interface PathEntry {
  nodeId: string;
  choiceIndex?: number;   // Which choice was picked (for question nodes)
  choiceLabel?: string;
  multiSelectValues?: Record<string, string>; // Dimension selections (for multi_select nodes)
}

// Interview modes
export type InterviewMode = 'mock_interview' | 'tutor' | 'designer';

export interface ModeConfig {
  mode: InterviewMode;
  timerEnforced: boolean;
  autoAdvanceInfo: boolean;
  showHints: boolean;
  showComparison: boolean;
  showNotes: boolean;
  showComments: boolean;
  showAskAI: boolean;
  showGraph: boolean;
  showKeyboardHints: boolean;
  voiceAutoEnabled: boolean;
  drivingFriendly: boolean;
  showExplanations: boolean;
  pauseForUnderstanding: boolean;
  useDialogue: boolean;
}

export interface WizardState {
  currentNodeId: string;
  path: PathEntry[];
  visitedNodeIds: Set<string>;
}

// Comments / suggestions on nodes
export type CommentType = 'suggestion' | 'question' | 'feedback' | 'answer';
export type CommentStatus = 'pending' | 'approved' | 'answered' | 'rejected';

export interface NodeComment {
  id: string;
  problem_id: string;
  node_id: string;
  user_id?: string;
  author_name: string;
  content: string;
  comment_type: CommentType;
  parent_id?: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  vote_score?: number;
  user_vote?: 1 | -1 | null;
  replies?: NodeComment[];
}

// For the gallery
export interface ProblemMeta {
  id: string;
  title: string;
  description: string;
  author?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  source: 'builtin' | 'gallery' | 'draft';
}

// Audit log
export type AuditAction = 'approved' | 'rejected' | 'flagged' | 'answered' | 'deleted';
export type ActorType = 'human' | 'ai';

// LLM-backed dynamic interview
export type InterviewResponseIntent = 'match_choice' | 'clarification' | 'novel_answer';

export interface InterviewLLMResponse {
  intent: InterviewResponseIntent;
  matchedChoiceIndex?: number;
  interviewerReply: string;
  choiceLabel?: string;
  choiceAnswer?: string;
}

export interface AuditLogEntry {
  id: string;
  comment_id: string | null;
  action: AuditAction;
  actor_type: ActorType;
  actor_id: string | null;
  actor_name: string;
  reason: string | null;
  confidence: number | null;
  rules_applied: string[] | null;
  metadata: Record<string, any>;
  created_at: string;
}
