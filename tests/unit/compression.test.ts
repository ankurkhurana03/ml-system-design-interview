import { describe, it, expect } from 'vitest';
import { compressText, decompressText, isCompressed, decompressTextSafe } from '@/utils/compression';

const sampleYaml = `id: test-problem
title: "Test Problem"
description: "A test problem for compression"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    content: |
      This is a test problem with enough content to show meaningful compression.
      ML system design involves multiple stages including problem definition,
      metrics selection, data pipeline design, feature engineering,
      model architecture, training strategy, deployment, and monitoring.
    next: q1
  - id: q1
    stage: metrics
    type: question
    label: "Metrics Choice"
    content: "Which metrics should we optimize?"
    choices:
      - answer: "Precision-focused"
        next: precision_path
      - answer: "Recall-focused"
        next: recall_path
  - id: precision_path
    stage: metrics
    type: info
    label: "Precision Path"
    content: "We'll optimize for precision to minimize false positives."
    next: end
  - id: recall_path
    stage: metrics
    type: info
    label: "Recall Path"
    content: "We'll optimize for recall to minimize false negatives."
    next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    content: "Interview complete."`;

describe('compression', () => {
  describe('compressText / decompressText', () => {
    it('round-trips correctly', () => {
      const compressed = compressText(sampleYaml);
      const decompressed = decompressText(compressed);
      expect(decompressed).toBe(sampleYaml);
    });

    it('produces smaller output than input for structured YAML', () => {
      const compressed = compressText(sampleYaml);
      expect(compressed.length).toBeLessThan(sampleYaml.length);
    });

    it('handles empty string', () => {
      const compressed = compressText('');
      const decompressed = decompressText(compressed);
      expect(decompressed).toBe('');
    });

    it('handles single character', () => {
      const compressed = compressText('a');
      const decompressed = decompressText(compressed);
      expect(decompressed).toBe('a');
    });
  });

  describe('isCompressed', () => {
    it('returns false for raw YAML starting with id:', () => {
      expect(isCompressed(sampleYaml)).toBe(false);
    });

    it('returns false for YAML starting with ---', () => {
      expect(isCompressed('---\nid: test\n')).toBe(false);
    });

    it('returns false for YAML starting with #', () => {
      expect(isCompressed('# comment\nid: test\n')).toBe(false);
    });

    it('returns false for YAML array starting with - id:', () => {
      expect(isCompressed('- id: node1\n  type: info\n')).toBe(false);
    });

    it('returns true for compressed content', () => {
      const compressed = compressText(sampleYaml);
      expect(isCompressed(compressed)).toBe(true);
    });
  });

  describe('decompressTextSafe', () => {
    it('decompresses compressed content', () => {
      const compressed = compressText(sampleYaml);
      expect(decompressTextSafe(compressed)).toBe(sampleYaml);
    });

    it('returns raw YAML unchanged', () => {
      expect(decompressTextSafe(sampleYaml)).toBe(sampleYaml);
    });

    it('handles YAML with leading whitespace', () => {
      const yaml = '  id: test\ntitle: "Test"';
      expect(decompressTextSafe(yaml)).toBe(yaml);
    });
  });

  describe('compression ratio', () => {
    it('achieves meaningful compression on structured YAML', () => {
      const compressed = compressText(sampleYaml);
      const ratio = compressed.length / sampleYaml.length;
      // Expect at least 20% reduction (ratio < 0.8)
      // Larger YAML files (real problems) see 50-65% reduction
      expect(ratio).toBeLessThan(0.8);
    });
  });
});
