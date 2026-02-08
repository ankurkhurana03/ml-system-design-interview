/**
 * localStorage CRUD for per-problem progress tracking and study analytics.
 * Key pattern: `progress.${problemId}`
 * Index key: `progress_index` (lightweight list of all tracked problem IDs)
 */

export interface ProblemProgress {
  problemId: string;
  problemTitle: string;
  completionPercent: number;
  pathsExplored: number;
  totalPaths: number;
  nodesVisited: number;
  totalNodes: number;
  timeSpentSeconds: number;
  lastVisitedAt: string; // ISO timestamp
  completedAt?: string;  // ISO timestamp, set when >80% visited
}

const STORAGE_KEY_PREFIX = 'progress.';
const INDEX_KEY = 'progress_index';

function storageKey(problemId: string): string {
  return `${STORAGE_KEY_PREFIX}${problemId}`;
}

// ── Index management ─────────────────────────────────────────────────────

function getIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIndex(ids: string[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // quota exceeded — silently ignore
  }
}

function addToIndex(problemId: string): void {
  const ids = getIndex();
  if (!ids.includes(problemId)) {
    ids.push(problemId);
    saveIndex(ids);
  }
}

function removeFromIndex(problemId: string): void {
  const ids = getIndex().filter((id) => id !== problemId);
  saveIndex(ids);
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export function getProgress(problemId: string): ProblemProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(problemId));
    if (!raw) return null;
    return JSON.parse(raw) as ProblemProgress;
  } catch {
    return null;
  }
}

export function saveProgress(problemId: string, data: ProblemProgress): void {
  try {
    localStorage.setItem(storageKey(problemId), JSON.stringify(data));
    addToIndex(problemId);
  } catch {
    // quota exceeded — silently ignore
  }
}

export function getAllProgress(): ProblemProgress[] {
  const ids = getIndex();
  const results: ProblemProgress[] = [];

  for (const id of ids) {
    const progress = getProgress(id);
    if (progress) {
      results.push(progress);
    }
  }

  return results;
}

export function clearProgress(problemId: string): void {
  try {
    localStorage.removeItem(storageKey(problemId));
    removeFromIndex(problemId);
  } catch {
    // ignore
  }
}

export function clearAllProgress(): void {
  const ids = getIndex();
  for (const id of ids) {
    try {
      localStorage.removeItem(storageKey(id));
    } catch {
      // ignore
    }
  }
  try {
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // ignore
  }
}

// ── Aggregate stats ──────────────────────────────────────────────────────

export interface AggregateStats {
  totalProblemsAttempted: number;
  totalProblemsCompleted: number; // >80% visited
  totalStudyTimeSeconds: number;
  averageCompletionPercent: number;
}

export function getAggregateStats(): AggregateStats {
  const all = getAllProgress();

  if (all.length === 0) {
    return {
      totalProblemsAttempted: 0,
      totalProblemsCompleted: 0,
      totalStudyTimeSeconds: 0,
      averageCompletionPercent: 0,
    };
  }

  const totalStudyTimeSeconds = all.reduce((sum, p) => sum + p.timeSpentSeconds, 0);
  const totalProblemsCompleted = all.filter((p) => p.completionPercent >= 80).length;
  const averageCompletionPercent =
    all.reduce((sum, p) => sum + p.completionPercent, 0) / all.length;

  return {
    totalProblemsAttempted: all.length,
    totalProblemsCompleted,
    totalStudyTimeSeconds,
    averageCompletionPercent: Math.round(averageCompletionPercent),
  };
}
