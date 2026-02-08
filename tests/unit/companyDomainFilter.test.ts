import { describe, it, expect } from 'vitest';
import type { ProblemMeta } from '@/types/tree';

// Extract the pure filter logic used in Sidebar and GalleryView for testing
function filterProblems(
  problems: ProblemMeta[],
  searchQuery: string,
  selectedCompanies: Set<string>,
  selectedDomains: Set<string>,
): ProblemMeta[] {
  const query = searchQuery.toLowerCase();
  return problems.filter((p) => {
    const matchesSearch =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
      p.companies?.some((c) => c.toLowerCase().includes(query)) ||
      p.domains?.some((d) => d.toLowerCase().includes(query));

    const matchesCompany =
      selectedCompanies.size === 0 ||
      p.companies?.some((c) => selectedCompanies.has(c));

    const matchesDomain =
      selectedDomains.size === 0 ||
      p.domains?.some((d) => selectedDomains.has(d));

    return matchesSearch && matchesCompany && matchesDomain;
  });
}

function computeAvailableOptions(problems: ProblemMeta[]) {
  const companies = new Set<string>();
  const domains = new Set<string>();
  for (const p of problems) {
    p.companies?.forEach((c) => companies.add(c));
    p.domains?.forEach((d) => domains.add(d));
  }
  return {
    companies: [...companies].sort(),
    domains: [...domains].sort(),
  };
}

const PROBLEMS: ProblemMeta[] = [
  {
    id: 'flight-delay',
    title: 'Flight Delay Prediction',
    description: 'Predict flight delays',
    companies: ['Google', 'Amazon', 'Uber'],
    domains: ['Time Series', 'Tabular/Structured'],
    source: 'builtin',
  },
  {
    id: 'dynamic-pricing',
    title: 'Dynamic Pricing Engine',
    description: 'RL-based surge pricing',
    companies: ['Uber', 'Airbnb', 'Lyft'],
    domains: ['RL', 'Recommendation'],
    source: 'builtin',
  },
  {
    id: 'spam-detection',
    title: 'Email Spam Detection',
    description: 'Classify spam emails using NLP',
    companies: ['Google', 'Microsoft'],
    domains: ['NLP'],
    tags: ['classification'],
    source: 'gallery',
  },
  {
    id: 'no-tags',
    title: 'Bare Problem',
    description: 'A problem with no company or domain tags',
    source: 'draft',
  },
];

describe('companyDomainFilter', () => {
  describe('filterProblems', () => {
    it('should return all problems when no filters active', () => {
      const result = filterProblems(PROBLEMS, '', new Set(), new Set());
      expect(result).toHaveLength(4);
    });

    it('should filter by single company (OR within)', () => {
      const result = filterProblems(PROBLEMS, '', new Set(['Airbnb']), new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dynamic-pricing');
    });

    it('should filter by multiple companies (OR within)', () => {
      const result = filterProblems(PROBLEMS, '', new Set(['Airbnb', 'Microsoft']), new Set());
      expect(result).toHaveLength(2);
      const ids = result.map((p) => p.id).sort();
      expect(ids).toEqual(['dynamic-pricing', 'spam-detection']);
    });

    it('should filter by single domain', () => {
      const result = filterProblems(PROBLEMS, '', new Set(), new Set(['NLP']));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spam-detection');
    });

    it('should filter by multiple domains (OR within)', () => {
      const result = filterProblems(PROBLEMS, '', new Set(), new Set(['NLP', 'RL']));
      expect(result).toHaveLength(2);
      const ids = result.map((p) => p.id).sort();
      expect(ids).toEqual(['dynamic-pricing', 'spam-detection']);
    });

    it('should AND across company and domain filters', () => {
      // Uber + RL: only dynamic-pricing has both
      const result = filterProblems(PROBLEMS, '', new Set(['Uber']), new Set(['RL']));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dynamic-pricing');
    });

    it('should return nothing when AND yields no match', () => {
      // Airbnb + NLP: no problem has both
      const result = filterProblems(PROBLEMS, '', new Set(['Airbnb']), new Set(['NLP']));
      expect(result).toHaveLength(0);
    });

    it('should exclude problems without companies/domains when company filter is active', () => {
      const result = filterProblems(PROBLEMS, '', new Set(['Google']), new Set());
      // 'no-tags' has no companies, should be excluded
      expect(result.find((p) => p.id === 'no-tags')).toBeUndefined();
      expect(result).toHaveLength(2); // flight-delay, spam-detection
    });

    it('should match company names in text search', () => {
      const result = filterProblems(PROBLEMS, 'uber', new Set(), new Set());
      expect(result).toHaveLength(2); // flight-delay and dynamic-pricing both have Uber
    });

    it('should match domain names in text search', () => {
      const result = filterProblems(PROBLEMS, 'nlp', new Set(), new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spam-detection');
    });

    it('should combine text search with company filter', () => {
      // Text: "pricing" matches dynamic-pricing title; company: Uber
      const result = filterProblems(PROBLEMS, 'pricing', new Set(['Uber']), new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dynamic-pricing');
    });

    it('should match tags in text search', () => {
      const result = filterProblems(PROBLEMS, 'classification', new Set(), new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spam-detection');
    });

    it('should handle case-insensitive search', () => {
      const result = filterProblems(PROBLEMS, 'GOOGLE', new Set(), new Set());
      expect(result).toHaveLength(2); // flight-delay, spam-detection
    });
  });

  describe('computeAvailableOptions', () => {
    it('should collect all unique companies from problems', () => {
      const options = computeAvailableOptions(PROBLEMS);
      expect(options.companies).toContain('Google');
      expect(options.companies).toContain('Amazon');
      expect(options.companies).toContain('Uber');
      expect(options.companies).toContain('Airbnb');
      expect(options.companies).toContain('Microsoft');
      expect(options.companies).toContain('Lyft');
      // Should be sorted
      expect(options.companies).toEqual([...options.companies].sort());
    });

    it('should collect all unique domains from problems', () => {
      const options = computeAvailableOptions(PROBLEMS);
      expect(options.domains).toContain('Time Series');
      expect(options.domains).toContain('Tabular/Structured');
      expect(options.domains).toContain('RL');
      expect(options.domains).toContain('Recommendation');
      expect(options.domains).toContain('NLP');
      // Should be sorted
      expect(options.domains).toEqual([...options.domains].sort());
    });

    it('should deduplicate across problems', () => {
      const options = computeAvailableOptions(PROBLEMS);
      // Uber appears in both flight-delay and dynamic-pricing
      const uberCount = options.companies.filter((c) => c === 'Uber').length;
      expect(uberCount).toBe(1);
    });

    it('should handle problems with no companies/domains', () => {
      const options = computeAvailableOptions([PROBLEMS[3]]); // no-tags problem
      expect(options.companies).toHaveLength(0);
      expect(options.domains).toHaveLength(0);
    });

    it('should handle empty problem list', () => {
      const options = computeAvailableOptions([]);
      expect(options.companies).toHaveLength(0);
      expect(options.domains).toHaveLength(0);
    });
  });
});
