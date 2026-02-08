import { describe, it, expect } from 'vitest';
import { STUDY_PLANS } from '@/data/studyPlans';
import type { StudyPlan } from '@/data/studyPlans';
import { loadBuiltinProblems } from '@/data/problems';

describe('studyPlans', () => {
  describe('structure validation', () => {
    it('should have at least one study plan', () => {
      expect(STUDY_PLANS.length).toBeGreaterThan(0);
    });

    it.each(STUDY_PLANS)('plan "$id" has valid structure', (plan: StudyPlan) => {
      // Required string fields
      expect(typeof plan.id).toBe('string');
      expect(plan.id.length).toBeGreaterThan(0);

      expect(typeof plan.title).toBe('string');
      expect(plan.title.length).toBeGreaterThan(0);

      expect(typeof plan.description).toBe('string');
      expect(plan.description.length).toBeGreaterThan(0);

      // Difficulty must be one of the valid values
      expect(['beginner', 'intermediate', 'advanced']).toContain(plan.difficulty);

      // estimatedHours must be a positive number
      expect(typeof plan.estimatedHours).toBe('number');
      expect(plan.estimatedHours).toBeGreaterThan(0);

      // problemIds must be a non-empty array of strings
      expect(Array.isArray(plan.problemIds)).toBe(true);
      expect(plan.problemIds.length).toBeGreaterThan(0);
      for (const id of plan.problemIds) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('problemIds reference real built-in problem files', () => {
    const problems = loadBuiltinProblems();
    const builtinIds = new Set(problems.map((p) => p.id));

    it.each(STUDY_PLANS)(
      'plan "$id" only references existing built-in problems',
      (plan: StudyPlan) => {
        for (const problemId of plan.problemIds) {
          expect(
            builtinIds.has(problemId),
            `Study plan "${plan.id}" references problem "${problemId}" which does not exist in built-in problems. Available: ${Array.from(builtinIds).join(', ')}`,
          ).toBe(true);
        }
      },
    );
  });

  describe('no duplicate IDs', () => {
    it('should have unique plan IDs across all plans', () => {
      const ids = STUDY_PLANS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it.each(STUDY_PLANS)(
      'plan "$id" should not have duplicate problemIds within itself',
      (plan: StudyPlan) => {
        const uniqueProblemIds = new Set(plan.problemIds);
        expect(
          uniqueProblemIds.size,
          `Study plan "${plan.id}" has duplicate problem IDs`,
        ).toBe(plan.problemIds.length);
      },
    );
  });
});
