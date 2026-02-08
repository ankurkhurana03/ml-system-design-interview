import { useState, useMemo, useRef, useEffect } from 'react';
import type { ProblemMeta } from '@/types/tree';

interface SidebarProps {
  problems: ProblemMeta[];
  activeProblemId: string | null;
  onSelectProblem: (id: string) => void;
  onGenerateNew: () => void;
  onBrowseGallery: () => void;
  onDeleteProblem: (id: string) => void;
  onEditDraft: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Simple SVG Icons
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const GalleryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const difficultyColors = {
  beginner: 'bg-green-600',
  intermediate: 'bg-yellow-600',
  advanced: 'bg-red-600',
};

export function Sidebar({
  problems,
  activeProblemId,
  onSelectProblem,
  onGenerateNew,
  onBrowseGallery,
  onDeleteProblem,
  onEditDraft,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Compute available options from actual problem data
  const availableOptions = useMemo(() => {
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
  }, [problems]);

  const activeFilterCount = selectedCompanies.size + selectedDomains.size;

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

  const clearFilters = () => {
    setSelectedCompanies(new Set());
    setSelectedDomains(new Set());
  };

  // Group problems by source with filtering
  const groupedProblems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = problems.filter((p) => {
      // Text search: title, description, tags, companies, domains
      const matchesSearch =
        !query ||
        (p.title ?? '').toLowerCase().includes(query) ||
        (p.description ?? '').toLowerCase().includes(query) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        p.companies?.some((c) => c.toLowerCase().includes(query)) ||
        p.domains?.some((d) => d.toLowerCase().includes(query));

      // Company filter: OR within selection
      const matchesCompany =
        selectedCompanies.size === 0 ||
        p.companies?.some((c) => selectedCompanies.has(c));

      // Domain filter: OR within selection
      const matchesDomain =
        selectedDomains.size === 0 ||
        p.domains?.some((d) => selectedDomains.has(d));

      // AND across categories
      return matchesSearch && matchesCompany && matchesDomain;
    });

    return {
      builtin: filtered.filter((p) => p.source === 'builtin'),
      gallery: filtered.filter((p) => p.source === 'gallery'),
      draft: filtered.filter((p) => p.source === 'draft'),
    };
  }, [problems, searchQuery, selectedCompanies, selectedDomains]);

  if (isCollapsed) {
    return (
      <div className="w-12 h-screen bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Expand sidebar"
        >
          <ChevronRightIcon />
        </button>

        <div className="mt-6 text-slate-300">
          <BrainIcon />
        </div>

        <div className="flex-1" />

        <button
          onClick={onGenerateNew}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          title="Generate New Problem"
        >
          <PlusIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="w-70 h-screen bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainIcon />
          <h1 className="text-lg font-bold text-white">ML System Design</h1>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      {(availableOptions.companies.length > 0 || availableOptions.domains.length > 0) && (
        <div className="border-b border-slate-700">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="font-medium">
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </span>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear all
                </span>
              )}
              <span className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}>
                <ChevronDownIcon />
              </span>
            </div>
          </button>

          {filtersExpanded && (
            <div className="px-3 pb-3 space-y-3">
              {/* Company filters */}
              {availableOptions.companies.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Company
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableOptions.companies.map((company) => (
                      <button
                        key={company}
                        onClick={() => toggleCompany(company)}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          selectedCompanies.has(company)
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Domain filters */}
              {availableOptions.domains.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Domain
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableOptions.domains.map((domain) => (
                      <button
                        key={domain}
                        onClick={() => toggleDomain(domain)}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          selectedDomains.has(domain)
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Problem List */}
      <div className="flex-1 overflow-y-auto">
        {/* Built-in Problems */}
        {groupedProblems.builtin.length > 0 && (
          <div className="p-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Built-in
            </h2>
            <div className="space-y-1">
              {groupedProblems.builtin.map(problem => (
                <ProblemItem
                  key={problem.id}
                  problem={problem}
                  isActive={problem.id === activeProblemId}
                  onClick={() => onSelectProblem(problem.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Gallery Problems */}
        {groupedProblems.gallery.length > 0 && (
          <div className="p-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Gallery
            </h2>
            <div className="space-y-1">
              {groupedProblems.gallery.map(problem => (
                <ProblemItem
                  key={problem.id}
                  problem={problem}
                  isActive={problem.id === activeProblemId}
                  onClick={() => onSelectProblem(problem.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Draft Problems */}
        {groupedProblems.draft.length > 0 && (
          <div className="p-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              My Drafts ({groupedProblems.draft.length})
            </h2>
            <div className="space-y-1">
              {groupedProblems.draft.map(problem => (
                <ProblemItem
                  key={problem.id}
                  problem={problem}
                  isActive={problem.id === activeProblemId}
                  onClick={() => onSelectProblem(problem.id)}
                  isDraft
                  onEdit={() => onEditDraft(problem.id)}
                  onDelete={() => onDeleteProblem(problem.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {groupedProblems.builtin.length === 0 &&
         groupedProblems.gallery.length === 0 &&
         groupedProblems.draft.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            No problems found
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button
          onClick={onBrowseGallery}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
        >
          <GalleryIcon />
          <span>Browse Gallery</span>
          {groupedProblems.gallery.length > 0 && (
            <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {groupedProblems.gallery.length}
            </span>
          )}
        </button>
        <button
          onClick={onGenerateNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <PlusIcon />
          <span>Generate New Problem</span>
        </button>
      </div>
    </div>
  );
}

interface ProblemItemProps {
  problem: ProblemMeta;
  isActive: boolean;
  onClick: () => void;
  isDraft?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProblemItem({ problem, isActive, onClick, isDraft, onEdit, onDelete }: ProblemItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-tight flex-1">
            {problem.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {problem.difficulty && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  difficultyColors[problem.difficulty]
                } text-white`}
              >
                {problem.difficulty[0].toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <p className={`text-xs leading-relaxed ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
          {truncateText(problem.description, 80)}
        </p>
        {/* General tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {problem.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Company & domain badges */}
        {((problem.companies && problem.companies.length > 0) ||
          (problem.domains && problem.domains.length > 0)) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {problem.companies?.slice(0, 2).map((company) => (
              <span
                key={company}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive
                    ? 'bg-teal-700 text-teal-100'
                    : 'bg-teal-900/50 text-teal-300'
                }`}
              >
                {company}
              </span>
            ))}
            {problem.domains?.slice(0, 2).map((domain) => (
              <span
                key={domain}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive
                    ? 'bg-purple-700 text-purple-100'
                    : 'bg-purple-900/50 text-purple-300'
                }`}
              >
                {domain}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Draft action menu button */}
      {isDraft && (
        <div ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
              setConfirmDelete(false);
            }}
            className={`absolute top-2 right-2 p-1 rounded transition-colors ${
              menuOpen
                ? 'bg-slate-600 text-white'
                : 'opacity-0 group-hover:opacity-100 hover:bg-slate-600 text-slate-400 hover:text-white'
            }`}
            title="Draft actions"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-8 right-2 z-20 w-32 bg-slate-700 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
              {confirmDelete ? (
                <div className="p-2">
                  <p className="text-xs text-slate-300 mb-2">Delete this draft?</p>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        setConfirmDelete(false);
                        onDelete?.();
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(false);
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit?.();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
