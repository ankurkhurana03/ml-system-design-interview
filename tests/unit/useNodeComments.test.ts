import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { NodeComment } from '@/types/tree';

// Mock supabase — use vi.hoisted to avoid TDZ issues
const { mockSelect, mockEq, mockIs, mockOrder, mockIn, mockInsert, mockGetUser } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIs: vi.fn(),
  mockOrder: vi.fn(),
  mockIn: vi.fn(),
  mockInsert: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
    auth: {
      getUser: mockGetUser,
    },
  },
}));

// Import after mock setup
import { useNodeComments } from '@/hooks/useNodeComments';

describe('useNodeComments', () => {
  const problemId = 'test-problem-1';
  const nodeId = 'test-node-1';
  const storageKey = `comments_${problemId}_${nodeId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock chains — each mock returns an object with ALL chainable methods
    // so that any order of calls works without overwriting
    const chainable = { eq: mockEq, is: mockIs, order: mockOrder, in: mockIn };
    mockSelect.mockReturnValue(chainable);
    mockEq.mockReturnValue(chainable);
    mockIs.mockReturnValue(chainable);
    mockIn.mockReturnValue(chainable);
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty comments array', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load comments from Supabase successfully', async () => {
    const mockComments: NodeComment[] = [
      {
        id: 'comment-1',
        problem_id: problemId,
        node_id: nodeId,
        author_name: 'John Doe',
        content: 'This is a suggestion',
        comment_type: 'suggestion',
        status: 'approved',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'comment-2',
        problem_id: problemId,
        node_id: nodeId,
        author_name: 'Jane Smith',
        content: 'This is a question',
        comment_type: 'question',
        status: 'approved',
        created_at: '2024-01-02T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
      },
    ];

    // First call for parent comments, second call for replies
    mockOrder
      .mockResolvedValueOnce({ data: mockComments, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].author_name).toBe('John Doe');
    expect(result.current.comments[1].author_name).toBe('Jane Smith');
    expect(result.current.error).toBeNull();
  });

  it('should nest replies correctly under parent comments', async () => {
    const mockParentComment: NodeComment = {
      id: 'parent-1',
      problem_id: problemId,
      node_id: nodeId,
      author_name: 'Parent Author',
      content: 'Parent comment',
      comment_type: 'question',
      status: 'approved',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const mockReply: NodeComment = {
      id: 'reply-1',
      problem_id: problemId,
      node_id: nodeId,
      parent_id: 'parent-1',
      author_name: 'Reply Author',
      content: 'This is a reply',
      comment_type: 'answer',
      status: 'approved',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    };

    // First call for parent comments, second call for replies
    mockOrder
      .mockResolvedValueOnce({ data: [mockParentComment], error: null })
      .mockResolvedValueOnce({ data: [mockReply], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].id).toBe('parent-1');
    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies![0].id).toBe('reply-1');
    expect(result.current.comments[0].replies![0].parent_id).toBe('parent-1');
  });

  it('should add comment optimistically to state', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment(
        'New suggestion content',
        'Test User',
        'suggestion'
      );
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].content).toBe('New suggestion content');
    expect(result.current.comments[0].author_name).toBe('Test User');
    expect(result.current.comments[0].comment_type).toBe('suggestion');
    expect(result.current.comments[0].status).toBe('approved');
  });

  it('should add reply optimistically under parent comment', async () => {
    const parentComment: NodeComment = {
      id: 'parent-1',
      problem_id: problemId,
      node_id: nodeId,
      author_name: 'Parent Author',
      content: 'Parent comment',
      comment_type: 'question',
      status: 'approved',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      replies: [],
    };

    mockOrder
      .mockResolvedValueOnce({ data: [parentComment], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment(
        'This is a reply',
        'Reply Author',
        'answer',
        'parent-1'
      );
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies![0].content).toBe('This is a reply');
    expect(result.current.comments[0].replies![0].parent_id).toBe('parent-1');
  });

  it('should fallback to localStorage when Supabase is unavailable', async () => {
    const localComments: NodeComment[] = [
      {
        id: 'local-1',
        problem_id: problemId,
        node_id: nodeId,
        author_name: 'Local User',
        content: 'Local comment',
        comment_type: 'feedback',
        status: 'approved',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ];

    localStorage.setItem(storageKey, JSON.stringify(localComments));

    // Simulate Supabase error
    mockOrder.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].author_name).toBe('Local User');
    expect(result.current.error).toBeTruthy();
  });

  it('should store comment to localStorage when Supabase insert fails', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockInsert.mockRejectedValueOnce(new Error('Insert failed'));

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment(
        'Fallback comment',
        'Fallback User',
        'suggestion'
      );
    });

    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();

    const parsedComments = JSON.parse(stored!);
    expect(parsedComments).toHaveLength(1);
    expect(parsedComments[0].content).toBe('Fallback comment');
    expect(parsedComments[0].author_name).toBe('Fallback User');
  });

  it('should refetch comments when refetch is called', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newComments: NodeComment[] = [
      {
        id: 'new-comment',
        problem_id: problemId,
        node_id: nodeId,
        author_name: 'New User',
        content: 'New content',
        comment_type: 'question',
        status: 'approved',
        created_at: '2024-01-03T00:00:00.000Z',
        updated_at: '2024-01-03T00:00:00.000Z',
      },
    ];

    mockOrder
      .mockResolvedValueOnce({ data: newComments, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].id).toBe('new-comment');
  });

  it('should handle different comment types', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add suggestion
    await act(async () => {
      await result.current.addComment('Suggestion', 'User1', 'suggestion');
    });

    // Add question
    await act(async () => {
      await result.current.addComment('Question', 'User2', 'question');
    });

    // Add feedback
    await act(async () => {
      await result.current.addComment('Feedback', 'User3', 'feedback');
    });

    expect(result.current.comments).toHaveLength(3);
    expect(result.current.comments[0].comment_type).toBe('suggestion');
    expect(result.current.comments[1].comment_type).toBe('question');
    expect(result.current.comments[2].comment_type).toBe('feedback');
  });

  it('should not fetch comments if problemId or nodeId is missing', () => {
    const { result: result1 } = renderHook(() => useNodeComments('', nodeId));
    expect(result1.current.loading).toBe(false);
    expect(result1.current.comments).toEqual([]);

    const { result: result2 } = renderHook(() => useNodeComments(problemId, ''));
    expect(result2.current.loading).toBe(false);
    expect(result2.current.comments).toEqual([]);
  });

  it('should generate unique IDs for new comments', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment('Comment 1', 'User1', 'suggestion');
    });

    await act(async () => {
      await result.current.addComment('Comment 2', 'User2', 'question');
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBeTruthy();
    expect(result.current.comments[1].id).toBeTruthy();
    expect(result.current.comments[0].id).not.toBe(result.current.comments[1].id);
  });

  it('should set correct timestamps for new comments', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const beforeTime = new Date().toISOString();

    const { result } = renderHook(() => useNodeComments(problemId, nodeId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment('Timed comment', 'TimeUser', 'feedback');
    });

    const afterTime = new Date().toISOString();

    const comment = result.current.comments[0];
    expect(comment.created_at).toBeTruthy();
    expect(comment.updated_at).toBeTruthy();
    expect(comment.created_at).toBe(comment.updated_at);
    expect(new Date(comment.created_at).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(new Date(comment.created_at).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
  });
});
