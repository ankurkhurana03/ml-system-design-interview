import { stringify } from 'yaml';
import { supabase } from '@/lib/supabase';
import type { TreeNode } from '@/types/tree';

interface SubmitBranchParams {
  problemId: string;
  targetNodeId: string;
  choiceLabel: string;
  choiceAnswer: string;
  newNodes: TreeNode[];
  authorId?: string;
  authorName?: string;
}

/**
 * Submit a generated branch for moderation review.
 * The branch is stored with status 'pending' until an admin approves it.
 * Silently fails if the user is not authenticated.
 */
export async function submitBranchForModeration(params: SubmitBranchParams): Promise<void> {
  const {
    problemId,
    targetNodeId,
    choiceLabel,
    choiceAnswer,
    newNodes,
    authorId,
    authorName,
  } = params;

  if (!authorId) return;

  const yamlContent = stringify(newNodes);

  await supabase.from('generated_branches').insert({
    problem_id: problemId,
    target_node_id: targetNodeId,
    choice_label: choiceLabel,
    choice_answer: choiceAnswer,
    yaml_content: yamlContent,
    status: 'pending',
    author_id: authorId,
    author_name: authorName || 'Anonymous',
  });
}
