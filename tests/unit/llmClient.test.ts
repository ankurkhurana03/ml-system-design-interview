import { describe, it, expect } from 'vitest';
import { stripThinkingBlocks, tryParseJSON } from '@/utils/llmClient';

describe('stripThinkingBlocks', () => {
  it('removes a single thinking block', () => {
    const input = '<think>Some reasoning here</think>The actual answer';
    expect(stripThinkingBlocks(input)).toBe('The actual answer');
  });

  it('removes multiple thinking blocks', () => {
    const input = '<think>First thought</think>Hello <think>Second thought</think>World';
    expect(stripThinkingBlocks(input)).toBe('Hello World');
  });

  it('handles multiline thinking blocks', () => {
    const input = '<think>\nLine 1\nLine 2\n</think>\nThe result';
    expect(stripThinkingBlocks(input)).toBe('The result');
  });

  it('returns original text when no thinking blocks present', () => {
    const input = 'Just normal text';
    expect(stripThinkingBlocks(input)).toBe('Just normal text');
  });

  it('trims whitespace', () => {
    const input = '  <think>blah</think>  result  ';
    expect(stripThinkingBlocks(input)).toBe('result');
  });
});

describe('tryParseJSON', () => {
  it('parses a valid JSON array', () => {
    const input = '[{"id": "node1", "label": "Hello"}]';
    const result = tryParseJSON(input);
    expect(result).toEqual([{ id: 'node1', label: 'Hello' }]);
  });

  it('extracts JSON from markdown code blocks', () => {
    const input = '```json\n[{"id": "node1"}]\n```';
    const result = tryParseJSON(input);
    expect(result).toEqual([{ id: 'node1' }]);
  });

  it('extracts JSON from plain code blocks', () => {
    const input = '```\n[{"id": "node1"}]\n```';
    const result = tryParseJSON(input);
    expect(result).toEqual([{ id: 'node1' }]);
  });

  it('returns null for non-array JSON', () => {
    const input = '{"id": "node1"}';
    expect(tryParseJSON(input)).toBeNull();
  });

  it('returns null for non-JSON text', () => {
    const input = 'This is not JSON at all';
    expect(tryParseJSON(input)).toBeNull();
  });

  it('fixes truncated JSON with unclosed string', () => {
    const input = '[{"id": "node1", "label": "Hello';
    const result = tryParseJSON(input);
    expect(result).not.toBeNull();
    expect(result![0]).toHaveProperty('id', 'node1');
  });

  it('fixes truncated JSON with unclosed object', () => {
    const input = '[{"id": "node1"';
    const result = tryParseJSON(input);
    expect(result).not.toBeNull();
    expect(result![0]).toHaveProperty('id', 'node1');
  });

  it('fixes truncated JSON with missing array close', () => {
    const input = '[{"id": "node1"}';
    const result = tryParseJSON(input);
    expect(result).not.toBeNull();
    expect(result![0]).toHaveProperty('id', 'node1');
  });

  it('handles empty array', () => {
    const input = '[]';
    expect(tryParseJSON(input)).toEqual([]);
  });

  it('handles whitespace around JSON', () => {
    const input = '  \n  [{"id": "node1"}]  \n  ';
    const result = tryParseJSON(input);
    expect(result).toEqual([{ id: 'node1' }]);
  });
});
