import { describe, it, expect } from 'vitest';
import { COMPANY_OPTIONS, DOMAIN_OPTIONS } from '@/constants/tagOptions';

describe('tagOptions', () => {
  describe('COMPANY_OPTIONS', () => {
    it('should be a non-empty array of strings', () => {
      expect(COMPANY_OPTIONS.length).toBeGreaterThan(0);
      for (const c of COMPANY_OPTIONS) {
        expect(typeof c).toBe('string');
        expect(c.length).toBeGreaterThan(0);
      }
    });

    it('should contain no duplicates', () => {
      const unique = new Set(COMPANY_OPTIONS);
      expect(unique.size).toBe(COMPANY_OPTIONS.length);
    });

    it('should include well-known companies', () => {
      expect(COMPANY_OPTIONS).toContain('Google');
      expect(COMPANY_OPTIONS).toContain('Meta');
      expect(COMPANY_OPTIONS).toContain('Amazon');
      expect(COMPANY_OPTIONS).toContain('Uber');
    });
  });

  describe('DOMAIN_OPTIONS', () => {
    it('should be a non-empty array of strings', () => {
      expect(DOMAIN_OPTIONS.length).toBeGreaterThan(0);
      for (const d of DOMAIN_OPTIONS) {
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(0);
      }
    });

    it('should contain no duplicates', () => {
      const unique = new Set(DOMAIN_OPTIONS);
      expect(unique.size).toBe(DOMAIN_OPTIONS.length);
    });

    it('should include common ML domains', () => {
      expect(DOMAIN_OPTIONS).toContain('NLP');
      expect(DOMAIN_OPTIONS).toContain('Vision');
      expect(DOMAIN_OPTIONS).toContain('RL');
      expect(DOMAIN_OPTIONS).toContain('Recommendation');
    });
  });
});
