import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDraftList,
  saveDraftList,
  getDraftProblem,
  saveDraftProblem,
  deleteDraft,
  isDraft,
  getActiveProblemId,
  saveActiveProblemId,
} from '@/utils/draftStore';
import type { Problem, ProblemMeta } from '@/types/tree';

const mockStorage = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    length: 0,
    key: vi.fn(() => null),
  };
});

vi.stubGlobal('localStorage', mockStorage);

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 'test-draft-1',
    title: 'Test Draft',
    description: 'A test draft problem',
    root: 'node_1',
    nodes: [
      {
        id: 'node_1',
        stage: 'problem_definition',
        type: 'terminal',
        label: 'Start',
        speaker: 'interviewer',
        content: 'Hello',
      },
    ],
    ...overrides,
  };
}

function makeMeta(overrides: Partial<ProblemMeta> = {}): ProblemMeta {
  return {
    id: 'test-draft-1',
    title: 'Test Draft',
    description: 'A test draft',
    source: 'draft',
    ...overrides,
  };
}

describe('draftStore', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('getDraftList / saveDraftList', () => {
    it('returns empty array when no drafts exist', () => {
      expect(getDraftList()).toEqual([]);
    });

    it('saves and retrieves draft list', () => {
      const metas = [makeMeta(), makeMeta({ id: 'draft-2', title: 'Second' })];
      saveDraftList(metas);
      const result = getDraftList();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Draft');
      expect(result[1].title).toBe('Second');
    });

    it('handles corrupted JSON gracefully', () => {
      mockStorage.store['draft_problems_list'] = 'not-json';
      expect(getDraftList()).toEqual([]);
    });
  });

  describe('getDraftProblem / saveDraftProblem', () => {
    it('returns null for nonexistent draft', () => {
      expect(getDraftProblem('nonexistent')).toBeNull();
    });

    it('saves and retrieves a draft problem', () => {
      const problem = makeProblem();
      saveDraftProblem(problem);
      const result = getDraftProblem('test-draft-1');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Draft');
      expect(result!.nodes).toHaveLength(1);
    });

    it('saves draft problem and adds to draft list', () => {
      saveDraftProblem(makeProblem());
      const list = getDraftList();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('test-draft-1');
      expect(list[0].source).toBe('draft');
    });

    it('upserts into draft list (no duplicates)', () => {
      saveDraftProblem(makeProblem());
      saveDraftProblem(makeProblem({ title: 'Updated Title' }));
      const list = getDraftList();
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('Updated Title');
    });

    it('uses meta overrides for list entry', () => {
      saveDraftProblem(makeProblem(), {
        companies: ['Google'],
        domains: ['NLP'],
      });
      const list = getDraftList();
      expect(list[0].companies).toEqual(['Google']);
      expect(list[0].domains).toEqual(['NLP']);
    });
  });

  describe('deleteDraft', () => {
    it('removes draft problem and its list entry', () => {
      saveDraftProblem(makeProblem());
      expect(getDraftList()).toHaveLength(1);
      expect(getDraftProblem('test-draft-1')).not.toBeNull();

      deleteDraft('test-draft-1');
      expect(getDraftList()).toHaveLength(0);
      expect(getDraftProblem('test-draft-1')).toBeNull();
    });

    it('also cleans up enhanced_problem_ entry', () => {
      mockStorage.store['enhanced_problem_test-draft-1'] = '{}';
      saveDraftProblem(makeProblem());
      deleteDraft('test-draft-1');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('enhanced_problem_test-draft-1');
    });

    it('handles deleting nonexistent draft gracefully', () => {
      expect(() => deleteDraft('nonexistent')).not.toThrow();
    });
  });

  describe('isDraft', () => {
    it('returns false for nonexistent ID', () => {
      expect(isDraft('nonexistent')).toBe(false);
    });

    it('returns true for saved draft', () => {
      saveDraftProblem(makeProblem());
      expect(isDraft('test-draft-1')).toBe(true);
    });

    it('returns false after deletion', () => {
      saveDraftProblem(makeProblem());
      deleteDraft('test-draft-1');
      expect(isDraft('test-draft-1')).toBe(false);
    });
  });

  describe('getActiveProblemId / saveActiveProblemId', () => {
    it('returns null when nothing saved', () => {
      expect(getActiveProblemId()).toBeNull();
    });

    it('saves and retrieves active problem', () => {
      saveActiveProblemId('problem-1', 'builtin');
      const result = getActiveProblemId();
      expect(result).toEqual({ id: 'problem-1', source: 'builtin' });
    });

    it('overwrites previous active problem', () => {
      saveActiveProblemId('problem-1', 'builtin');
      saveActiveProblemId('draft-1', 'draft');
      const result = getActiveProblemId();
      expect(result).toEqual({ id: 'draft-1', source: 'draft' });
    });

    it('defaults source to builtin when missing', () => {
      mockStorage.store['app_active_problem_id'] = 'some-id';
      // No source key
      const result = getActiveProblemId();
      expect(result).toEqual({ id: 'some-id', source: 'builtin' });
    });
  });
});
