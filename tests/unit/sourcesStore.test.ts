import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSourcesForProblem,
  saveSourcesForProblem,
  addSource,
  removeSource,
  updateSource,
  clearSources,
} from '@/utils/sourcesStore';
import type { UserSource } from '@/types/tree';

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

function makeSource(overrides: Partial<UserSource> = {}): UserSource {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    title: 'Test Source',
    content: 'Some text content',
    addedAt: new Date().toISOString(),
    charCount: 17,
    ...overrides,
  };
}

describe('sourcesStore', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('returns empty array for missing problem', () => {
    const result = getSourcesForProblem('nonexistent');
    expect(result).toEqual([]);
  });

  it('saves and retrieves sources', () => {
    const source = makeSource();
    saveSourcesForProblem('prob1', [source]);
    const result = getSourcesForProblem('prob1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Source');
  });

  it('addSource appends to existing', () => {
    const s1 = makeSource({ title: 'First' });
    const s2 = makeSource({ title: 'Second' });
    saveSourcesForProblem('prob1', [s1]);
    const result = addSource('prob1', s2);
    expect(result).toHaveLength(2);
    expect(result[1].title).toBe('Second');
  });

  it('removeSource removes by id', () => {
    const s1 = makeSource({ id: 'keep-me', title: 'Keep' });
    const s2 = makeSource({ id: 'remove-me', title: 'Remove' });
    saveSourcesForProblem('prob1', [s1, s2]);
    const result = removeSource('prob1', 'remove-me');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('keep-me');
  });

  it('updateSource merges partial updates', () => {
    const s1 = makeSource({ id: 'src1', title: 'Original' });
    saveSourcesForProblem('prob1', [s1]);
    const result = updateSource('prob1', 'src1', { title: 'Updated', summary: 'A summary' });
    expect(result[0].title).toBe('Updated');
    expect(result[0].summary).toBe('A summary');
    expect(result[0].content).toBe('Some text content'); // untouched
  });

  it('clearSources removes all sources for problem', () => {
    saveSourcesForProblem('prob1', [makeSource()]);
    clearSources('prob1');
    expect(getSourcesForProblem('prob1')).toEqual([]);
  });

  it('handles corrupted localStorage gracefully', () => {
    mockStorage.store['sources.prob1'] = 'not valid json';
    expect(getSourcesForProblem('prob1')).toEqual([]);
  });
});
