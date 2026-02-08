import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProgress,
  saveProgress,
  getAllProgress,
  clearProgress,
  clearAllProgress,
  getAggregateStats,
} from '@/utils/progressStore';
import type { ProblemProgress } from '@/utils/progressStore';

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

function makeProgress(overrides: Partial<ProblemProgress> = {}): ProblemProgress {
  return {
    problemId: 'test-problem',
    problemTitle: 'Test Problem',
    completionPercent: 50,
    pathsExplored: 1,
    totalPaths: 4,
    nodesVisited: 5,
    totalNodes: 10,
    timeSpentSeconds: 300,
    lastVisitedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('progressStore', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('getProgress', () => {
    it('returns null for non-existent problem', () => {
      expect(getProgress('nonexistent')).toBeNull();
    });

    it('returns saved progress', () => {
      const progress = makeProgress({ problemId: 'prob1' });
      saveProgress('prob1', progress);
      const result = getProgress('prob1');
      expect(result).not.toBeNull();
      expect(result!.problemId).toBe('prob1');
      expect(result!.completionPercent).toBe(50);
    });

    it('handles corrupted localStorage gracefully', () => {
      mockStorage.store['progress.bad'] = 'not valid json {';
      expect(getProgress('bad')).toBeNull();
    });
  });

  describe('saveProgress', () => {
    it('stores progress with correct key pattern', () => {
      const progress = makeProgress({ problemId: 'my-prob' });
      saveProgress('my-prob', progress);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'progress.my-prob',
        expect.any(String),
      );
    });

    it('adds problem ID to index', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));

      const index = JSON.parse(mockStorage.store['progress_index']);
      expect(index).toContain('prob1');
    });

    it('does not duplicate problem ID in index', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));
      saveProgress('prob1', makeProgress({ problemId: 'prob1', completionPercent: 75 }));

      const index = JSON.parse(mockStorage.store['progress_index']);
      const count = index.filter((id: string) => id === 'prob1').length;
      expect(count).toBe(1);
    });

    it('updates existing progress data', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1', completionPercent: 25 }));
      saveProgress('prob1', makeProgress({ problemId: 'prob1', completionPercent: 75 }));

      const result = getProgress('prob1');
      expect(result!.completionPercent).toBe(75);
    });
  });

  describe('getAllProgress', () => {
    it('returns empty array when no progress saved', () => {
      expect(getAllProgress()).toEqual([]);
    });

    it('returns all saved progress entries', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1', problemTitle: 'Problem 1' }));
      saveProgress('prob2', makeProgress({ problemId: 'prob2', problemTitle: 'Problem 2' }));
      saveProgress('prob3', makeProgress({ problemId: 'prob3', problemTitle: 'Problem 3' }));

      const all = getAllProgress();
      expect(all).toHaveLength(3);
      const titles = all.map((p) => p.problemTitle);
      expect(titles).toContain('Problem 1');
      expect(titles).toContain('Problem 2');
      expect(titles).toContain('Problem 3');
    });

    it('skips entries where data is missing but index references them', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));
      // Manually remove the data but leave the index intact
      delete mockStorage.store['progress.prob1'];

      const all = getAllProgress();
      expect(all).toHaveLength(0);
    });
  });

  describe('clearProgress', () => {
    it('removes progress for a specific problem', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));
      saveProgress('prob2', makeProgress({ problemId: 'prob2' }));

      clearProgress('prob1');

      expect(getProgress('prob1')).toBeNull();
      expect(getProgress('prob2')).not.toBeNull();
    });

    it('removes problem ID from index', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));
      saveProgress('prob2', makeProgress({ problemId: 'prob2' }));

      clearProgress('prob1');

      const index = JSON.parse(mockStorage.store['progress_index']);
      expect(index).not.toContain('prob1');
      expect(index).toContain('prob2');
    });
  });

  describe('clearAllProgress', () => {
    it('removes all progress data and index', () => {
      saveProgress('prob1', makeProgress({ problemId: 'prob1' }));
      saveProgress('prob2', makeProgress({ problemId: 'prob2' }));
      saveProgress('prob3', makeProgress({ problemId: 'prob3' }));

      clearAllProgress();

      expect(getProgress('prob1')).toBeNull();
      expect(getProgress('prob2')).toBeNull();
      expect(getProgress('prob3')).toBeNull();
      expect(getAllProgress()).toEqual([]);
    });

    it('handles empty state gracefully', () => {
      expect(() => clearAllProgress()).not.toThrow();
    });
  });

  describe('getAggregateStats', () => {
    it('returns zeros when no progress exists', () => {
      const stats = getAggregateStats();
      expect(stats.totalProblemsAttempted).toBe(0);
      expect(stats.totalProblemsCompleted).toBe(0);
      expect(stats.totalStudyTimeSeconds).toBe(0);
      expect(stats.averageCompletionPercent).toBe(0);
    });

    it('calculates totalProblemsAttempted correctly', () => {
      saveProgress('p1', makeProgress({ problemId: 'p1' }));
      saveProgress('p2', makeProgress({ problemId: 'p2' }));
      saveProgress('p3', makeProgress({ problemId: 'p3' }));

      const stats = getAggregateStats();
      expect(stats.totalProblemsAttempted).toBe(3);
    });

    it('counts completed problems as those with >=80% completion', () => {
      saveProgress('p1', makeProgress({ problemId: 'p1', completionPercent: 90 }));
      saveProgress('p2', makeProgress({ problemId: 'p2', completionPercent: 80 }));
      saveProgress('p3', makeProgress({ problemId: 'p3', completionPercent: 79 }));
      saveProgress('p4', makeProgress({ problemId: 'p4', completionPercent: 50 }));

      const stats = getAggregateStats();
      expect(stats.totalProblemsCompleted).toBe(2); // 90% and 80%
    });

    it('sums total study time across all problems', () => {
      saveProgress('p1', makeProgress({ problemId: 'p1', timeSpentSeconds: 100 }));
      saveProgress('p2', makeProgress({ problemId: 'p2', timeSpentSeconds: 200 }));
      saveProgress('p3', makeProgress({ problemId: 'p3', timeSpentSeconds: 300 }));

      const stats = getAggregateStats();
      expect(stats.totalStudyTimeSeconds).toBe(600);
    });

    it('calculates average completion percent (rounded)', () => {
      saveProgress('p1', makeProgress({ problemId: 'p1', completionPercent: 100 }));
      saveProgress('p2', makeProgress({ problemId: 'p2', completionPercent: 50 }));
      saveProgress('p3', makeProgress({ problemId: 'p3', completionPercent: 33 }));

      const stats = getAggregateStats();
      // (100 + 50 + 33) / 3 = 61
      expect(stats.averageCompletionPercent).toBe(61);
    });

    it('handles single problem correctly', () => {
      saveProgress('p1', makeProgress({ problemId: 'p1', completionPercent: 85, timeSpentSeconds: 600 }));

      const stats = getAggregateStats();
      expect(stats.totalProblemsAttempted).toBe(1);
      expect(stats.totalProblemsCompleted).toBe(1);
      expect(stats.totalStudyTimeSeconds).toBe(600);
      expect(stats.averageCompletionPercent).toBe(85);
    });
  });
});
