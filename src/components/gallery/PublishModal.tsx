import { useState } from 'react';
import { useGallery } from '@/hooks/useGallery';
import { useAuth } from '@/hooks/useAuth';
import { useWizard } from '@/context/WizardContext';
import { COMPANY_OPTIONS, DOMAIN_OPTIONS } from '@/constants/tagOptions';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const { problem } = useWizard();
  const { publishProblem } = useGallery();
  const { user } = useAuth();

  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'intermediate',
  );
  const [tagsInput, setTagsInput] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handlePublish = async () => {
    if (!problem) {
      setError('No problem to publish');
      return;
    }

    if (!user) {
      setError('You must be signed in to publish problems');
      return;
    }

    setPublishing(true);
    setError(null);

    // Parse tags
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5); // Max 5 tags

    const result = await publishProblem(
      problem,
      difficulty,
      tags,
      [...selectedCompanies],
      [...selectedDomains],
    );

    if (result.success) {
      setPublished(true);
    } else {
      setError(result.error || 'Failed to publish problem');
    }

    setPublishing(false);
  };

  const handleClose = () => {
    setPublished(false);
    setError(null);
    setTagsInput('');
    setDifficulty('intermediate');
    setSelectedCompanies(new Set());
    setSelectedDomains(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:rounded-lg md:max-w-2xl md:max-h-[90vh] md:h-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Publish to Gallery</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {published ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Published Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your problem is now available in the gallery for others to explore.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Problem Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Problem Preview</h3>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {problem?.title || 'Untitled Problem'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {problem?.description || 'No description available'}
                  </p>
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {problem?.nodes.length || 0} nodes in this problem
                  </div>
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <div className="flex gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                        difficulty === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Companies
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_OPTIONS.map((company) => (
                    <button
                      key={company}
                      onClick={() => toggleCompany(company)}
                      className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                        selectedCompanies.has(company)
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {company}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select companies where this problem is commonly asked
                </p>
              </div>

              {/* Domains */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Domains
                </label>
                <div className="flex flex-wrap gap-2">
                  {DOMAIN_OPTIONS.map((domain) => (
                    <button
                      key={domain}
                      onClick={() => toggleDomain(domain)}
                      className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                        selectedDomains.has(domain)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {domain}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select ML domains this problem covers
                </p>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated, max 5)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. recommendation, nlp, computer-vision"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use tags to help others find your problem
                </p>
              </div>

              {/* Author Info */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Author
                </label>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {user?.user_metadata?.user_name ||
                      user?.user_metadata?.full_name ||
                      user?.email?.split('@')[0] ||
                      'Anonymous'}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Publishing will make your problem available to all users in the gallery. You can
                  only publish problems that you have created or modified.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!published && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={publishing}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !problem || !user}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish to Gallery'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
