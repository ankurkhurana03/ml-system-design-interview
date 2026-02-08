import { describe, it, expect } from 'vitest';
import { parseYaml } from '@/utils/yamlLoader';

const YAML_WITH_TAGS = `id: test
title: "Test Problem"
description: "A test problem"
companies: ["Google", "Meta"]
domains: ["NLP", "Ranking/Search"]
root: start
nodes:
  - id: start
    stage: problem_definition
    type: terminal
    label: "Start"
    speaker: interviewer
    content: "Test content"
`;

const YAML_WITHOUT_TAGS = `id: test2
title: "Test Problem 2"
description: "No tags"
root: start
nodes:
  - id: start
    stage: problem_definition
    type: terminal
    label: "Start"
    speaker: interviewer
    content: "Test content"
`;

describe('YAML companies/domains parsing', () => {
  it('should preserve companies array from YAML', () => {
    const problem = parseYaml(YAML_WITH_TAGS) as any;
    expect(problem.companies).toEqual(['Google', 'Meta']);
  });

  it('should preserve domains array from YAML', () => {
    const problem = parseYaml(YAML_WITH_TAGS) as any;
    expect(problem.domains).toEqual(['NLP', 'Ranking/Search']);
  });

  it('should not have companies/domains when absent from YAML', () => {
    const problem = parseYaml(YAML_WITHOUT_TAGS) as any;
    expect(problem.companies).toBeUndefined();
    expect(problem.domains).toBeUndefined();
  });

  it('should still validate the tree correctly with extra fields', () => {
    const problem = parseYaml(YAML_WITH_TAGS);
    expect(problem.id).toBe('test');
    expect(problem.title).toBe('Test Problem');
    expect(problem.nodes).toHaveLength(1);
    expect(problem.nodes[0].type).toBe('terminal');
  });
});
