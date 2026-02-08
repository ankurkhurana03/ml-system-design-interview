/**
 * localStorage CRUD for per-problem user sources.
 * Key pattern: `sources.${problemId}`
 */

import type { UserSource } from '@/types/tree';

const STORAGE_KEY_PREFIX = 'sources.';

function storageKey(problemId: string): string {
  return `${STORAGE_KEY_PREFIX}${problemId}`;
}

export function getSourcesForProblem(problemId: string): UserSource[] {
  try {
    const raw = localStorage.getItem(storageKey(problemId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSourcesForProblem(problemId: string, sources: UserSource[]): void {
  localStorage.setItem(storageKey(problemId), JSON.stringify(sources));
}

export function addSource(problemId: string, source: UserSource): UserSource[] {
  const sources = getSourcesForProblem(problemId);
  sources.push(source);
  saveSourcesForProblem(problemId, sources);
  return sources;
}

export function removeSource(problemId: string, sourceId: string): UserSource[] {
  const sources = getSourcesForProblem(problemId).filter(s => s.id !== sourceId);
  saveSourcesForProblem(problemId, sources);
  return sources;
}

export function updateSource(problemId: string, sourceId: string, updates: Partial<UserSource>): UserSource[] {
  const sources = getSourcesForProblem(problemId).map(s =>
    s.id === sourceId ? { ...s, ...updates } : s,
  );
  saveSourcesForProblem(problemId, sources);
  return sources;
}

export function clearSources(problemId: string): void {
  localStorage.removeItem(storageKey(problemId));
}
