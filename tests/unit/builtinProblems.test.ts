import { describe, it, expect } from 'vitest';
import { loadBuiltinProblems } from '@/data/problems';

describe('loadBuiltinProblems', () => {
  const problems = loadBuiltinProblems();

  it('should load at least 2 built-in problems', () => {
    expect(problems.length).toBeGreaterThanOrEqual(2);
  });

  it('should include flight-delay with companies and domains', () => {
    const fd = problems.find((p) => p.id === 'flight-delay');
    expect(fd).toBeDefined();
    expect(fd!.companies).toBeDefined();
    expect(fd!.companies!.length).toBeGreaterThan(0);
    expect(fd!.companies).toContain('Google');
    expect(fd!.companies).toContain('Amazon');
    expect(fd!.companies).toContain('Uber');

    expect(fd!.domains).toBeDefined();
    expect(fd!.domains!.length).toBeGreaterThan(0);
    expect(fd!.domains).toContain('Time Series');
    expect(fd!.domains).toContain('Tabular/Structured');
  });

  it('should include dynamic-pricing with companies and domains', () => {
    const dp = problems.find((p) => p.id === 'dynamic-pricing');
    expect(dp).toBeDefined();
    expect(dp!.companies).toBeDefined();
    expect(dp!.companies!.length).toBeGreaterThan(0);
    expect(dp!.companies).toContain('Uber');
    expect(dp!.companies).toContain('Airbnb');

    expect(dp!.domains).toBeDefined();
    expect(dp!.domains!.length).toBeGreaterThan(0);
    expect(dp!.domains).toContain('RL');
    expect(dp!.domains).toContain('Recommendation');
  });

  it('should preserve standard Problem fields alongside new metadata', () => {
    for (const p of problems) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.root).toBeTruthy();
      expect(p.nodes.length).toBeGreaterThan(0);
    }
  });
});
