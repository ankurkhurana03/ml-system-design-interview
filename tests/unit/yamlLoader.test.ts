import { describe, it, expect } from 'vitest';
import { parseYaml } from '@/utils/yamlLoader';

const VALID_YAML = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Test content"
    next: q1
  - id: q1
    stage: metrics
    type: question
    label: "Question 1"
    speaker: interviewer
    content: "Pick one"
    choices:
      - label: "A"
        answer: "Chose A"
        next: end
      - label: "B"
        answer: "Chose B"
        next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
`;

describe('yamlLoader', () => {
  describe('parseYaml', () => {
    it('should parse valid YAML string to correct Problem object', () => {
      const problem = parseYaml(VALID_YAML);

      expect(problem.id).toBe('test');
      expect(problem.title).toBe('Test Problem');
      expect(problem.description).toBe('A test problem');
      expect(problem.root).toBe('start');
      expect(problem.nodes.length).toBe(3);

      // Check first node
      expect(problem.nodes[0].id).toBe('start');
      expect(problem.nodes[0].stage).toBe('problem_definition');
      expect(problem.nodes[0].type).toBe('info');
      expect(problem.nodes[0].label).toBe('Start');
      expect(problem.nodes[0].speaker).toBe('interviewer');
      expect(problem.nodes[0].content).toBe('Test content');
      expect(problem.nodes[0].next).toBe('q1');

      // Check question node
      expect(problem.nodes[1].id).toBe('q1');
      expect(problem.nodes[1].type).toBe('question');
      expect(problem.nodes[1].choices?.length).toBe(2);
      expect(problem.nodes[1].choices?.[0].label).toBe('A');
      expect(problem.nodes[1].choices?.[0].answer).toBe('Chose A');
      expect(problem.nodes[1].choices?.[0].next).toBe('end');

      // Check terminal node
      expect(problem.nodes[2].id).toBe('end');
      expect(problem.nodes[2].type).toBe('terminal');
    });

    it('should throw error for invalid YAML syntax', () => {
      const invalidYaml = `id: test
title: "Unclosed quote
description: test
`;

      expect(() => parseYaml(invalidYaml)).toThrow();
    });

    it('should throw error for null/empty YAML string', () => {
      expect(() => parseYaml('')).toThrow(
        'Failed to parse YAML: result is null or undefined'
      );
    });

    it('should throw error for YAML with invalid tree structure - missing root', () => {
      const yamlMissingRoot = `id: test
title: "Test Problem"
description: "A test problem"
root: nonexistent
nodes:
  - id: start
    stage: problem_definition
    type: terminal
    label: "Start"
    speaker: interviewer
    content: "Test content"
`;

      expect(() => parseYaml(yamlMissingRoot)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlMissingRoot)).toThrow(
        /Root node 'nonexistent' does not exist in nodes/
      );
    });

    it('should throw error for YAML with invalid tree structure - question with 1 choice', () => {
      const yamlOneChoice = `id: test
title: "Test Problem"
description: "A test problem"
root: q1
nodes:
  - id: q1
    stage: metrics
    type: question
    label: "Question"
    speaker: interviewer
    content: "Pick one"
    choices:
      - label: "Only option"
        answer: "Answer"
        next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
`;

      expect(() => parseYaml(yamlOneChoice)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlOneChoice)).toThrow(
        /question nodes must have at least 2 choices/
      );
    });

    it('should throw error for YAML with invalid tree structure - broken next reference', () => {
      const yamlBrokenNext = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: nonexistent
`;

      expect(() => parseYaml(yamlBrokenNext)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlBrokenNext)).toThrow(
        /next reference 'nonexistent' does not exist/
      );
    });

    it('should throw error for YAML with invalid tree structure - missing required fields', () => {
      const yamlMissingField = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    speaker: interviewer
    content: "Start"
    next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
`;

      expect(() => parseYaml(yamlMissingField)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlMissingField)).toThrow(/must have a valid label/);
    });

    it('should throw error for YAML with terminal node having next property', () => {
      const yamlTerminalWithNext = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: terminal
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: somewhere
`;

      expect(() => parseYaml(yamlTerminalWithNext)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlTerminalWithNext)).toThrow(
        /terminal nodes should not have a 'next' property/
      );
    });

    it('should throw error for YAML with duplicate node IDs', () => {
      const yamlDuplicateIds = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: end
  - id: start
    stage: metrics
    type: terminal
    label: "Duplicate"
    speaker: interviewer
    content: "Duplicate"
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
`;

      expect(() => parseYaml(yamlDuplicateIds)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlDuplicateIds)).toThrow(/Duplicate node id: start/);
    });

    it('should throw error for YAML with orphan nodes', () => {
      const yamlOrphan = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
  - id: orphan
    stage: metrics
    type: terminal
    label: "Orphan"
    speaker: interviewer
    content: "Never reached"
`;

      expect(() => parseYaml(yamlOrphan)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlOrphan)).toThrow(/Node 'orphan' is unreachable from root/);
    });

    it('should include cycle warning when tree has cycles', () => {
      const yamlWithCycle = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: middle
  - id: middle
    stage: metrics
    type: info
    label: "Middle"
    speaker: interviewer
    content: "Middle"
    next: start
`;

      expect(() => parseYaml(yamlWithCycle)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlWithCycle)).toThrow(/Warning: Tree contains cycles/);
    });

    it('should throw error for YAML with info node missing next', () => {
      const yamlInfoNoNext = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
`;

      expect(() => parseYaml(yamlInfoNoNext)).toThrow(/Invalid tree:/);
      expect(() => parseYaml(yamlInfoNoNext)).toThrow(/info nodes must have a 'next' property/);
    });

    it('should parse YAML with multiple question nodes correctly', () => {
      const yamlMultipleQuestions = `id: test
title: "Test Problem"
description: "A test problem"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Start"
    speaker: interviewer
    content: "Start"
    next: q1
  - id: q1
    stage: metrics
    type: question
    label: "Question 1"
    speaker: interviewer
    content: "Pick first"
    choices:
      - label: "A"
        answer: "Chose A"
        next: q2
      - label: "B"
        answer: "Chose B"
        next: q2
  - id: q2
    stage: data
    type: question
    label: "Question 2"
    speaker: interviewer
    content: "Pick second"
    choices:
      - label: "X"
        answer: "Chose X"
        next: end
      - label: "Y"
        answer: "Chose Y"
        next: end
  - id: end
    stage: monitoring
    type: terminal
    label: "End"
    speaker: interviewer
    content: "Done"
`;

      const problem = parseYaml(yamlMultipleQuestions);

      expect(problem.nodes.length).toBe(4);
      expect(problem.nodes[1].type).toBe('question');
      expect(problem.nodes[1].choices?.length).toBe(2);
      expect(problem.nodes[2].type).toBe('question');
      expect(problem.nodes[2].choices?.length).toBe(2);
    });

    it('should handle all ML stages correctly', () => {
      const yamlAllStages = `id: test
title: "Test Problem"
description: "A test problem"
root: n1
nodes:
  - id: n1
    stage: problem_definition
    type: info
    label: "N1"
    speaker: interviewer
    content: "Content"
    next: n2
  - id: n2
    stage: metrics
    type: info
    label: "N2"
    speaker: interviewer
    content: "Content"
    next: n3
  - id: n3
    stage: data
    type: info
    label: "N3"
    speaker: interviewer
    content: "Content"
    next: n4
  - id: n4
    stage: features
    type: info
    label: "N4"
    speaker: interviewer
    content: "Content"
    next: n5
  - id: n5
    stage: model
    type: info
    label: "N5"
    speaker: interviewer
    content: "Content"
    next: n6
  - id: n6
    stage: training
    type: info
    label: "N6"
    speaker: interviewer
    content: "Content"
    next: n7
  - id: n7
    stage: deployment
    type: info
    label: "N7"
    speaker: interviewer
    content: "Content"
    next: n8
  - id: n8
    stage: monitoring
    type: terminal
    label: "N8"
    speaker: interviewer
    content: "Content"
`;

      const problem = parseYaml(yamlAllStages);

      expect(problem.nodes[0].stage).toBe('problem_definition');
      expect(problem.nodes[1].stage).toBe('metrics');
      expect(problem.nodes[2].stage).toBe('data');
      expect(problem.nodes[3].stage).toBe('features');
      expect(problem.nodes[4].stage).toBe('model');
      expect(problem.nodes[5].stage).toBe('training');
      expect(problem.nodes[6].stage).toBe('deployment');
      expect(problem.nodes[7].stage).toBe('monitoring');
    });
  });
});
