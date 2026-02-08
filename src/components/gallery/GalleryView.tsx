import { useState, useMemo } from 'react';
import { useGallery } from '@/hooks/useGallery';
import { useAuth } from '@/hooks/useAuth';
import { parse } from 'yaml';
import type { Problem } from '@/types/tree';
import { decompressTextSafe } from '@/utils/compression';

interface GalleryViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblem: (problem: Problem) => void;
}

type SortOption = 'newest' | 'most_upvoted' | 'alphabetical';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const difficultyColors = {
  beginner: 'bg-green-600',
  intermediate: 'bg-yellow-600',
  advanced: 'bg-red-600',
};

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className="w-5 h-5"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

export function GalleryView({ isOpen, onClose, onSelectProblem }: GalleryViewProps) {
  const { galleryProblems, loading, upvoteProblem, removeUpvote, userUpvotes } = useGallery();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());

  // Compute available options from gallery data
  const availableOptions = useMemo(() => {
    const companies = new Set<string>();
    const domains = new Set<string>();
    for (const p of galleryProblems) {
      p.companies?.forEach((c) => companies.add(c));
      p.domains?.forEach((d) => domains.add(d));
    }
    return {
      companies: [...companies].sort(),
      domains: [...domains].sort(),
    };
  }, [galleryProblems]);

  const toggleCompany = (company: string) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const activeFilterCount = selectedCompanies.size + selectedDomains.size;

  const filteredAndSortedProblems = useMemo(() => {
    let filtered = galleryProblems.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.companies?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.domains?.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDifficulty =
        difficultyFilter === 'all' || p.difficulty === difficultyFilter;

      const matchesCompany =
        selectedCompanies.size === 0 ||
        p.companies?.some((c) => selectedCompanies.has(c));

      const matchesDomain =
        selectedDomains.size === 0 ||
        p.domains?.some((d) => selectedDomains.has(d));

      return matchesSearch && matchesDifficulty && matchesCompany && matchesDomain;
    });

    // Sort
    switch (sortOption) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'most_upvoted':
        filtered.sort((a, b) => b.upvotes - a.upvotes);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [galleryProblems, searchQuery, sortOption, difficultyFilter, selectedCompanies, selectedDomains]);

  const handleUpvote = async (problemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to upvote problems');
      return;
    }

    if (userUpvotes.has(problemId)) {
      await removeUpvote(problemId);
    } else {
      await upvoteProblem(problemId);
    }
  };

  const handleLoadProblem = (yamlContent: string) => {
    try {
      const problem = parse(decompressTextSafe(yamlContent)) as Problem;
      onSelectProblem(problem);
      onClose();
    } catch (err) {
      console.error('Failed to parse problem:', err);
      alert('Failed to load problem');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:rounded-lg md:max-w-6xl md:max-h-[90vh] md:h-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Problem Gallery</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Browse and load community-published ML system design problems
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search by title, description, tags, company, or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="most_upvoted">Most Upvoted</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-2">
              {(['all', 'beginner', 'intermediate', 'advanced'] as DifficultyFilter[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    difficultyFilter === diff
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Company & Domain filter chips */}
          {(availableOptions.companies.length > 0 || availableOptions.domains.length > 0) && (
            <div className="space-y-2">
              {availableOptions.companies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Company:</span>
                  {availableOptions.companies.map((company) => (
                    <button
                      key={company}
                      onClick={() => toggleCompany(company)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        selectedCompanies.has(company)
                          ? 'bg-teal-600 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {company}
                    </button>
                  ))}
                </div>
              )}
              {availableOptions.domains.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Domain:</span>
                  {availableOptions.domains.map((domain) => (
                    <button
                      key={domain}
                      onClick={() => toggleDomain(domain)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        selectedDomains.has(domain)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedCompanies(new Set());
                    setSelectedDomains(new Set());
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear company/domain filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading gallery...</p>
              </div>
            </div>
          ) : filteredAndSortedProblems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">No problems found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedProblems.map((problem) => (
                <div
                  key={problem.id}
                  onClick={() => handleLoadProblem(problem.yaml_content)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-gray-900/50 hover:border-blue-400 transition-all cursor-pointer"
                >
                  {/* Title and Difficulty */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight flex-1">
                      {problem.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        difficultyColors[problem.difficulty]
                      } text-white shrink-0`}
                    >
                      {problem.difficulty[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                    {problem.description}
                  </p>

                  {/* Tags */}
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {problem.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Company & Domain badges */}
                  {((problem.companies && problem.companies.length > 0) ||
                    (problem.domains && problem.domains.length > 0)) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {problem.companies?.slice(0, 3).map((company) => (
                        <span
                          key={company}
                          className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded"
                        >
                          {company}
                        </span>
                      ))}
                      {problem.domains?.slice(0, 3).map((domain) => (
                        <span
                          key={domain}
                          className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">by {problem.author_name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(problem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleUpvote(problem.id, e)}
                      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                        userUpvotes.has(problem.id)
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                    >
                      <HeartIcon filled={userUpvotes.has(problem.id)} />
                      <span className="text-sm font-medium">{problem.upvotes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-sm text-gray-600 dark:text-gray-400">
          {filteredAndSortedProblems.length} problem{filteredAndSortedProblems.length !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
}
