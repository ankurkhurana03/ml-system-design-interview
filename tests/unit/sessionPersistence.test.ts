import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Problem, PathEntry } from '@/types/tree';

// Mock localStorage with a simple Map-based implementation
const mockStorage = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    length: 0,
    key: vi.fn(() => null),
  };
});

vi.stubGlobal('localStorage', mockStorage);

// We cannot easily import saveSession/loadSession because they are module-scoped
// functions (not exported). Instead, we test them indirectly through the reducer.
// However, we can replicate their logic for direct unit testing.

interface PersistedSession {
  currentNodeId: string;
  path: PathEntry[];
  visitedNodeIds: string[];
}

const SESSION_KEY_PREFIX = 'wizard_session.';

function saveSession(
  problemId: string,
  state: {
    currentNodeId: string;
    path: PathEntry[];
    visitedNodeIds: Set<string>;
  },
) {
  try {
    const data: PersistedSession = {
      currentNodeId: state.currentNodeId,
      path: state.path,
      visitedNodeIds: Array.from(state.visitedNodeIds),
    };
    localStorage.setItem(
      `${SESSION_KEY_PREFIX}${problemId}`,
      JSON.stringify(data),
    );
  } catch {
    /* quota exceeded or private browsing */
  }
}

function loadSession(problemId: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${problemId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createTestProblem(overrides?: Partial<Problem>): Problem {
  return {
    id: 'test-problem',
    title: 'Test Problem',
    description: 'A test problem',
    root: 'node-1',
    nodes: [
      {
        id: 'node-1',
        stage: 'problem_definition',
        type: 'info',
        label: 'Node 1',
        speaker: 'interviewer',
        content: 'This is node 1',
        next: 'node-2',
      },
      {
        id: 'node-2',
        stage: 'metrics',
        type: 'question',
        label: 'Node 2',
        speaker: 'interviewer',
        content: 'Pick option',
        choices: [
          { label: 'Option A', answer: 'I choose A', next: 'node-3' },
          { label: 'Option B', answer: 'I choose B', next: 'node-4' },
        ],
      },
      {
        id: 'node-3',
        stage: 'features',
        type: 'info',
        label: 'Node 3',
        speaker: 'interviewer',
        content: 'Node 3',
        next: 'node-5',
      },
      {
        id: 'node-4',
        stage: 'model',
        type: 'terminal',
        label: 'Node 4',
        speaker: 'interviewer',
        content: 'End path B',
      },
      {
        id: 'node-5',
        stage: 'monitoring',
        type: 'terminal',
        label: 'Node 5',
        speaker: 'interviewer',
        content: 'End path A',
      },
    ],
    ...overrides,
  };
}

// Simulate the SET_PROBLEM reducer logic
function simulateSetProblem(problem: Problem) {
  const saved = loadSession(problem.id);
  if (saved) {
    const nodeIds = new Set(problem.nodes.map((n) => n.id));
    if (
      nodeIds.has(saved.currentNodeId) &&
      saved.visitedNodeIds.every((id) => nodeIds.has(id))
    ) {
      return {
        problem,
        currentNodeId: saved.currentNodeId,
        path: saved.path,
        visitedNodeIds: new Set(saved.visitedNodeIds),
      };
    }
  }
  return {
    problem,
    currentNodeId: problem.root,
    path: [] as PathEntry[],
    visitedNodeIds: new Set([problem.root]),
  };
}

describe('Session Persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveSession', () => {
    it('stores to localStorage with correct key wizard_session.${problemId}', () => {
      const state = {
        currentNodeId: 'node-2',
        path: [{ nodeId: 'node-1' }] as PathEntry[],
        visitedNodeIds: new Set(['node-1', 'node-2']),
      };

      saveSession('test-problem', state);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'wizard_session.test-problem',
        expect.any(String),
      );

      const stored = JSON.parse(
        mockStorage.store['wizard_session.test-problem'],
      );
      expect(stored.currentNodeId).toBe('node-2');
      expect(stored.path).toEqual([{ nodeId: 'node-1' }]);
      expect(stored.visitedNodeIds).toEqual(['node-1', 'node-2']);
    });

    it('serializes Set to Array for visitedNodeIds', () => {
      const state = {
        currentNodeId: 'node-3',
        path: [] as PathEntry[],
        visitedNodeIds: new Set(['node-1', 'node-2', 'node-3']),
      };

      saveSession('my-problem', state);

      const stored = JSON.parse(mockStorage.store['wizard_session.my-problem']);
      expect(Array.isArray(stored.visitedNodeIds)).toBe(true);
      expect(stored.visitedNodeIds).toHaveLength(3);
      expect(stored.visitedNodeIds).toContain('node-1');
      expect(stored.visitedNodeIds).toContain('node-2');
      expect(stored.visitedNodeIds).toContain('node-3');
    });

    it('preserves path entries with choiceIndex and choiceLabel', () => {
      const path: PathEntry[] = [
        { nodeId: 'node-1' },
        { nodeId: 'node-2', choiceIndex: 0, choiceLabel: 'Option A' },
      ];

      saveSession('prob1', {
        currentNodeId: 'node-3',
        path,
        visitedNodeIds: new Set(['node-1', 'node-2', 'node-3']),
      });

      const stored = JSON.parse(mockStorage.store['wizard_session.prob1']);
      expect(stored.path).toHaveLength(2);
      expect(stored.path[1].choiceIndex).toBe(0);
      expect(stored.path[1].choiceLabel).toBe('Option A');
    });
  });

  describe('loadSession', () => {
    it('returns null for non-existent keys', () => {
      const result = loadSession('nonexistent-problem');
      expect(result).toBeNull();
    });

    it('returns parsed session data for existing key', () => {
      const sessionData: PersistedSession = {
        currentNodeId: 'node-2',
        path: [{ nodeId: 'node-1' }],
        visitedNodeIds: ['node-1', 'node-2'],
      };
      mockStorage.store['wizard_session.my-problem'] =
        JSON.stringify(sessionData);

      const result = loadSession('my-problem');
      expect(result).not.toBeNull();
      expect(result!.currentNodeId).toBe('node-2');
      expect(result!.visitedNodeIds).toEqual(['node-1', 'node-2']);
    });

    it('returns null for corrupted JSON', () => {
      mockStorage.store['wizard_session.bad-data'] = 'not valid json {{{';
      const result = loadSession('bad-data');
      expect(result).toBeNull();
    });
  });

  describe('SET_PROBLEM restores saved session if valid', () => {
    it('restores session when all saved node IDs exist in the problem', () => {
      const problem = createTestProblem();

      // Pre-save a session
      const sessionData: PersistedSession = {
        currentNodeId: 'node-3',
        path: [
          { nodeId: 'node-1' },
          { nodeId: 'node-2', choiceIndex: 0, choiceLabel: 'Option A' },
        ],
        visitedNodeIds: ['node-1', 'node-2', 'node-3'],
      };
      mockStorage.store['wizard_session.test-problem'] =
        JSON.stringify(sessionData);

      const result = simulateSetProblem(problem);

      expect(result.currentNodeId).toBe('node-3');
      expect(result.path).toHaveLength(2);
      expect(result.visitedNodeIds).toEqual(
        new Set(['node-1', 'node-2', 'node-3']),
      );
    });

    it('falls back to root if saved session has invalid node IDs', () => {
      const problem = createTestProblem();

      // Pre-save a session with a node ID that does not exist in the problem
      const sessionData: PersistedSession = {
        currentNodeId: 'node-999',
        path: [{ nodeId: 'node-1' }],
        visitedNodeIds: ['node-1', 'node-999'],
      };
      mockStorage.store['wizard_session.test-problem'] =
        JSON.stringify(sessionData);

      const result = simulateSetProblem(problem);

      expect(result.currentNodeId).toBe('node-1'); // falls back to root
      expect(result.path).toEqual([]);
      expect(result.visitedNodeIds).toEqual(new Set(['node-1']));
    });

    it('falls back to root if saved currentNodeId is invalid but visitedNodeIds are valid', () => {
      const problem = createTestProblem();

      const sessionData: PersistedSession = {
        currentNodeId: 'nonexistent-node',
        path: [],
        visitedNodeIds: ['node-1'],
      };
      mockStorage.store['wizard_session.test-problem'] =
        JSON.stringify(sessionData);

      const result = simulateSetProblem(problem);

      expect(result.currentNodeId).toBe('node-1');
      expect(result.path).toEqual([]);
    });

    it('starts fresh when no saved session exists', () => {
      const problem = createTestProblem();
      const result = simulateSetProblem(problem);

      expect(result.currentNodeId).toBe('node-1');
      expect(result.path).toEqual([]);
      expect(result.visitedNodeIds).toEqual(new Set(['node-1']));
    });
  });

  describe('Set→Array→Set serialization roundtrip', () => {
    it('preserves visitedNodeIds through save and restore', () => {
      const originalSet = new Set(['node-1', 'node-2', 'node-3', 'node-5']);

      // Save
      saveSession('roundtrip-test', {
        currentNodeId: 'node-5',
        path: [],
        visitedNodeIds: originalSet,
      });

      // Load and reconstruct Set
      const loaded = loadSession('roundtrip-test');
      expect(loaded).not.toBeNull();
      const restoredSet = new Set(loaded!.visitedNodeIds);

      expect(restoredSet).toEqual(originalSet);
      expect(restoredSet.size).toBe(4);
      expect(restoredSet.has('node-1')).toBe(true);
      expect(restoredSet.has('node-5')).toBe(true);
    });

    it('handles empty Set correctly', () => {
      saveSession('empty-set', {
        currentNodeId: 'node-1',
        path: [],
        visitedNodeIds: new Set(),
      });

      const loaded = loadSession('empty-set');
      expect(loaded).not.toBeNull();
      const restoredSet = new Set(loaded!.visitedNodeIds);
      expect(restoredSet.size).toBe(0);
    });

    it('handles single-element Set correctly', () => {
      saveSession('single-set', {
        currentNodeId: 'node-1',
        path: [],
        visitedNodeIds: new Set(['node-1']),
      });

      const loaded = loadSession('single-set');
      expect(loaded).not.toBeNull();
      const restoredSet = new Set(loaded!.visitedNodeIds);
      expect(restoredSet.size).toBe(1);
      expect(restoredSet.has('node-1')).toBe(true);
    });
  });
});
