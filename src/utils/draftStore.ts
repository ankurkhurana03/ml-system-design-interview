/**
 * localStorage CRUD for draft problems and active problem tracking.
 *
 * Keys:
 *   draft_problems_list        — DraftMeta[] (lightweight index)
 *   draft_problem.${id}        — full Problem JSON
 *   app_active_problem_id      — last-viewed problem ID
 *   app_active_problem_source  — its source ('builtin' | 'gallery' | 'draft')
 */

import type { Problem, ProblemMeta } from '@/types/tree';

const LIST_KEY = 'draft_problems_list';
const PROBLEM_PREFIX = 'draft_problem.';
const ACTIVE_ID_KEY = 'app_active_problem_id';
const ACTIVE_SOURCE_KEY = 'app_active_problem_source';

// ── Draft list ──────────────────────────────────────────────────────────

export function getDraftList(): ProblemMeta[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDraftList(metas: ProblemMeta[]): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(metas));
  } catch {
    // quota exceeded — silently ignore
  }
}

// ── Individual draft problem ────────────────────────────────────────────

export function getDraftProblem(id: string): Problem | null {
  try {
    const raw = localStorage.getItem(`${PROBLEM_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Problem;
  } catch {
    return null;
  }
}

export function saveDraftProblem(problem: Problem, meta?: Partial<ProblemMeta>): void {
  try {
    // Persist full problem
    localStorage.setItem(`${PROBLEM_PREFIX}${problem.id}`, JSON.stringify(problem));

    // Upsert into draft list
    const list = getDraftList();
    const idx = list.findIndex((m) => m.id === problem.id);
    const entry: ProblemMeta = {
      id: problem.id,
      title: meta?.title ?? problem.title,
      description: meta?.description ?? problem.description,
      companies: meta?.companies ?? (problem as any).companies,
      domains: meta?.domains ?? (problem as any).domains,
      source: 'draft',
    };

    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    saveDraftList(list);
  } catch {
    // quota exceeded — silently ignore
  }
}

export function deleteDraft(id: string): void {
  try {
    localStorage.removeItem(`${PROBLEM_PREFIX}${id}`);
    const list = getDraftList().filter((m) => m.id !== id);
    saveDraftList(list);
    // Also clean up the enhanced_problem_ entry
    localStorage.removeItem(`enhanced_problem_${id}`);
  } catch {
    // ignore
  }
}

export function isDraft(id: string): boolean {
  const list = getDraftList();
  return list.some((m) => m.id === id);
}

// ── Active problem tracking ─────────────────────────────────────────────

export function getActiveProblemId(): { id: string; source: string } | null {
  try {
    const id = localStorage.getItem(ACTIVE_ID_KEY);
    const source = localStorage.getItem(ACTIVE_SOURCE_KEY);
    if (!id) return null;
    return { id, source: source || 'builtin' };
  } catch {
    return null;
  }
}

export function saveActiveProblemId(id: string, source: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
    localStorage.setItem(ACTIVE_SOURCE_KEY, source);
  } catch {
    // ignore
  }
}
