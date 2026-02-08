import { useState } from 'react';
import { stringify } from 'yaml';
import type { Problem } from '@/types/tree';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PublishButtonProps {
  problem: Problem;
  onPublished: () => void;
}

export function PublishButton({ problem, onPublished }: PublishButtonProps) {
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!user) {
      setError('Please sign in to publish');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const yamlContent = stringify(problem);

      // Check if a draft with this problem_id already exists
      const { data: existingDraft } = await supabase
        .from('user_drafts')
        .select('id')
        .eq('user_id', user.id)
        .eq('problem_id', problem.id)
        .single();

      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('user_drafts')
          .update({
            title: problem.title,
            description: problem.description,
            yaml_content: yamlContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDraft.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new draft
        const { error: insertError } = await supabase
          .from('user_drafts')
          .insert({
            user_id: user.id,
            problem_id: problem.id,
            title: problem.title,
            description: problem.description,
            yaml_content: yamlContent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          throw insertError;
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onPublished();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-md">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          Sign in to publish to gallery
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePublish}
        disabled={isPublishing || showSuccess}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPublishing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            <span>Publishing...</span>
          </>
        ) : showSuccess ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Published!</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Publish to Gallery</span>
          </>
        )}
      </button>

      {showSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md animate-fade-in">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-800 dark:text-green-200">
              Successfully published as draft! You can find it in your drafts.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={handlePublish}
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Your problem will be saved as a draft. You can submit it for review later to add it to the public gallery.
      </div>
    </div>
  );
}
