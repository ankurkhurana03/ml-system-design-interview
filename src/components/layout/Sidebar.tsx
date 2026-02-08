import { useState, useMemo } from 'react';
import type { ProblemMeta } from '@/types/tree';

interface SidebarProps {
  problems: ProblemMeta[];
  activeProblemId: string | null;
  onSelectProblem: (id: string) => void;
  onGenerateNew: () => void;
  onBrowseGallery: () => void;
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
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group problems by source
  const groupedProblems = useMemo(() => {
    const filtered = problems.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return {
      builtin: filtered.filter(p => p.source === 'builtin'),
      gallery: filtered.filter(p => p.source === 'gallery'),
      draft: filtered.filter(p => p.source === 'draft'),
    };
  }, [problems, searchQuery]);

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
              My Drafts
            </h2>
            <div className="space-y-1">
              {groupedProblems.draft.map(problem => (
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
}

function ProblemItem({ problem, isActive, onClick }: ProblemItemProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
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
        {problem.difficulty && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              difficultyColors[problem.difficulty]
            } text-white shrink-0`}
          >
            {problem.difficulty[0].toUpperCase()}
          </span>
        )}
      </div>
      <p className={`text-xs leading-relaxed ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
        {truncateText(problem.description, 80)}
      </p>
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
    </button>
  );
}
