import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeNode } from '@/types/tree';
import { decompressTextSafe } from '@/utils/compression';

// Hoisted mocks
const { mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Must import after mocks
import { submitBranchForModeration } from '@/utils/branchModeration';

describe('submitBranchForModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits branch to Supabase when user is authenticated', async () => {
    const newNodes: TreeNode[] = [
      { id: 'gen_1', stage: 'data', type: 'info', label: 'Data', speaker: 'interviewer', content: 'Content', next: 'gen_2' },
      { id: 'gen_2', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
    ];

    await submitBranchForModeration({
      problemId: 'test-problem',
      targetNodeId: 'q1',
      choiceLabel: 'Custom Approach',
      choiceAnswer: 'Using a novel method',
      newNodes,
      authorId: 'user-123',
      authorName: 'test@example.com',
    });

    expect(mockFrom).toHaveBeenCalledWith('generated_branches');
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.problem_id).toBe('test-problem');
    expect(insertArg.target_node_id).toBe('q1');
    expect(insertArg.choice_label).toBe('Custom Approach');
    expect(insertArg.choice_answer).toBe('Using a novel method');
    expect(insertArg.status).toBe('pending');
    expect(insertArg.author_id).toBe('user-123');
    expect(insertArg.author_name).toBe('test@example.com');
    // yaml_content is now compressed — decompress to verify content
    const decompressed = decompressTextSafe(insertArg.yaml_content);
    expect(decompressed).toContain('gen_1');
  });

  it('silently skips when user is not authenticated', async () => {
    const newNodes: TreeNode[] = [
      { id: 'gen_1', stage: 'data', type: 'terminal', label: 'Data', speaker: 'interviewer', content: 'Content' },
    ];

    await submitBranchForModeration({
      problemId: 'test-problem',
      targetNodeId: 'q1',
      choiceLabel: 'Test',
      choiceAnswer: 'Test',
      newNodes,
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('defaults author name to Anonymous', async () => {
    const newNodes: TreeNode[] = [
      { id: 'gen_1', stage: 'data', type: 'terminal', label: 'Data', speaker: 'interviewer', content: 'Content' },
    ];

    await submitBranchForModeration({
      problemId: 'test-problem',
      targetNodeId: 'q1',
      choiceLabel: 'Test',
      choiceAnswer: 'Test',
      newNodes,
      authorId: 'user-456',
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.author_name).toBe('Anonymous');
  });
});
