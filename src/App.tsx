import { useState, useEffect, useCallback } from 'react';
import { WizardProvider, useWizard } from '@/context/WizardContext';
import { ModeProvider } from '@/context/ModeContext';
import { VoiceOverProvider } from '@/context/VoiceOverContext';
import { useProblems } from '@/hooks/useProblems';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useVoiceOver } from '@/hooks/useVoiceOver';
import { useMode } from '@/hooks/useMode';
import { useModerationConfig } from '@/hooks/useModerationConfig';
import { useAutoModeration } from '@/hooks/useAutoModeration';
import { useProgressiveGeneration } from '@/hooks/useProgressiveGeneration';
import { Sidebar } from '@/components/layout/Sidebar';
import { SplitPane } from '@/components/layout/SplitPane';
import { TreeGraph } from '@/components/graph/TreeGraph';
import { WizardPanel } from '@/components/wizard/WizardPanel';
import { LoginPage } from '@/components/auth/LoginPage';
import { SettingsPanel } from '@/components/auth/SettingsPanel';
import { GenerateModal } from '@/components/generator/GenerateModal';
import { GenerationProgressBar } from '@/components/generator/GenerationProgressBar';
import { ModerationPanel } from '@/components/admin/ModerationPanel';
import { GalleryView } from '@/components/gallery/GalleryView';
import { PublishModal } from '@/components/gallery/PublishModal';
import { PracticeTimer } from '@/components/wizard/PracticeTimer';
import { ModeSelector } from '@/components/wizard/ModeSelector';
import { EditDraftModal } from '@/components/draft/EditDraftModal';
import { getActiveProblemId, saveActiveProblemId, saveDraftProblem, isDraft } from '@/utils/draftStore';
import type { Problem } from '@/types/tree';

function AppContent() {
  const { problemMetas, loading, getProblemById, addProblem, updateProblemInState, deleteProblem } = useProblems();
  const { setProblem, updateProblem, problem } = useWizard();
  const progressiveGen = useProgressiveGeneration({ updateProblem });
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const voiceOver = useVoiceOver();
  const { config: moderationConfig } = useModerationConfig();

  // Auto-moderation is active when admin is using the app
  useAutoModeration({
    config: moderationConfig,
    enabled: isAdmin,
  });

  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const { mode, config, setMode } = useMode();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);

  // Restore active problem from localStorage, or fall back to first builtin
  useEffect(() => {
    if (!loading && problemMetas.length > 0 && !activeProblemId) {
      const saved = getActiveProblemId();
      let targetId: string | null = null;

      if (saved) {
        // Verify the saved problem still exists
        const exists = problemMetas.some((m) => m.id === saved.id);
        if (exists) targetId = saved.id;
      }

      if (!targetId) {
        targetId = problemMetas[0].id;
      }

      setActiveProblemId(targetId);
      const p = getProblemById(targetId);
      if (p) setProblem(p);
    }
  }, [loading, problemMetas, activeProblemId, getProblemById, setProblem]);

  const handleSelectProblem = useCallback(
    (id: string) => {
      progressiveGen.cancel();
      setActiveProblemId(id);
      const p = getProblemById(id);
      if (p) setProblem(p);

      // Persist active problem selection
      const meta = problemMetas.find((m) => m.id === id);
      saveActiveProblemId(id, meta?.source || 'builtin');
    },
    [getProblemById, setProblem, progressiveGen, problemMetas],
  );

  const handleGenerateNew = useCallback(() => {
    setGenerateOpen(true);
  }, []);

  const handleBrowseGallery = useCallback(() => {
    setGalleryOpen(true);
  }, []);

  const handleGenerated = useCallback(
    (newProblem: Problem) => {
      addProblem(newProblem, 'draft');
      setActiveProblemId(newProblem.id);
      setProblem(newProblem);
      setGenerateOpen(false);
      saveActiveProblemId(newProblem.id, 'draft');
    },
    [addProblem, setProblem],
  );

  const handleSelectGalleryProblem = useCallback(
    (galleryProblem: Problem) => {
      progressiveGen.cancel();
      addProblem(galleryProblem, 'gallery');
      setActiveProblemId(galleryProblem.id);
      setProblem(galleryProblem);
      saveActiveProblemId(galleryProblem.id, 'gallery');
    },
    [addProblem, setProblem, progressiveGen],
  );

  const handleDeleteProblem = useCallback(
    (id: string) => {
      deleteProblem(id);
      // If the deleted problem was active, switch to first remaining
      if (activeProblemId === id) {
        const remaining = problemMetas.filter((m) => m.id !== id);
        if (remaining.length > 0) {
          const nextId = remaining[0].id;
          setActiveProblemId(nextId);
          const p = getProblemById(nextId);
          if (p) setProblem(p);
          saveActiveProblemId(nextId, remaining[0].source);
        } else {
          setActiveProblemId(null);
        }
      }
    },
    [activeProblemId, deleteProblem, getProblemById, problemMetas, setProblem],
  );

  const handleUpdateDraft = useCallback(
    (updated: Problem) => {
      updateProblemInState(updated);
      saveDraftProblem(updated);
      // If this is the active problem, update wizard state too
      if (activeProblemId === updated.id) {
        setProblem(updated);
      }
    },
    [activeProblemId, setProblem, updateProblemInState],
  );

  const handleEditDraft = useCallback((id: string) => {
    setEditDraftId(id);
  }, []);

  // Get the problem being edited (for EditDraftModal)
  const editingProblem = editDraftId ? getProblemById(editDraftId) : undefined;

  if (showLogin) {
    return <LoginPage onSkip={() => setShowLogin(false)} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading problems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        problems={problemMetas}
        activeProblemId={activeProblemId}
        onSelectProblem={handleSelectProblem}
        onGenerateNew={handleGenerateNew}
        onBrowseGallery={handleBrowseGallery}
        onDeleteProblem={handleDeleteProblem}
        onEditDraft={handleEditDraft}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {problem && (
              <>
                <h2 className="text-sm font-semibold text-gray-700 truncate">
                  {problem.title}
                </h2>
                {isDraft(problem.id) && (
                  <button
                    onClick={() => handleEditDraft(problem.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit draft"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Badge */}
            <button
              onClick={() => setModeSelectOpen(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                mode === 'mock_interview'
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  : mode === 'tutor'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Change Interview Mode"
            >
              {mode === 'mock_interview' ? 'Mock Interview' : mode === 'tutor' ? 'Tutor Mode' : 'Designer Mode'}
            </button>
            <PracticeTimer />
            {voiceOver.isSupported && (
              <button
                onClick={() => voiceOver.setEnabled(!voiceOver.enabled)}
                className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${
                  voiceOver.enabled ? 'text-indigo-600' : 'text-gray-500'
                }`}
                title={voiceOver.enabled ? 'Disable Voice-Over' : 'Enable Voice-Over'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setModerationOpen(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-amber-600 hover:text-amber-700 transition-colors"
                title="Moderation Panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>
            )}
            {user && problem && (
              <button
                onClick={() => setPublishOpen(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 hover:text-blue-700 transition-colors"
                title="Publish to Gallery"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              title="LLM Settings"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            {!user && (
              <button
                onClick={() => setShowLogin(true)}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <img
                  src={user.user_metadata?.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-gray-600">
                  {user.user_metadata?.user_name || user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {config.showGraph ? (
            <SplitPane
              left={<TreeGraph />}
              right={<WizardPanel />}
              defaultSplit={50}
            />
          ) : (
            <WizardPanel />
          )}
        </div>

        {/* Progressive generation progress bar */}
        {(progressiveGen.isGenerating || progressiveGen.failedStages.length > 0) && (
          <GenerationProgressBar
            isGenerating={progressiveGen.isGenerating}
            completedStages={progressiveGen.completedStages}
            pendingStages={progressiveGen.pendingStages}
            failedStages={progressiveGen.failedStages}
            onCancel={progressiveGen.cancel}
            onRetryFailed={progressiveGen.retryFailed}
          />
        )}
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GenerateModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
        onStartBackgroundFill={progressiveGen.startBackgroundFill}
      />
      <GalleryView
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelectProblem={handleSelectGalleryProblem}
      />
      <PublishModal isOpen={publishOpen} onClose={() => setPublishOpen(false)} />
      {isAdmin && moderationOpen && (
        <ModerationPanel
          isOpen={moderationOpen}
          onClose={() => setModerationOpen(false)}
        />
      )}
      <ModeSelector
        currentMode={mode}
        onSelectMode={setMode}
        isOpen={modeSelectOpen}
        onClose={() => setModeSelectOpen(false)}
      />

      {/* Edit Draft Modal */}
      {editingProblem && (
        <EditDraftModal
          isOpen={!!editDraftId}
          onClose={() => setEditDraftId(null)}
          problem={editingProblem}
          onSave={handleUpdateDraft}
          onDelete={(id) => {
            setEditDraftId(null);
            handleDeleteProblem(id);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ModeProvider>
      <VoiceOverProvider>
        <WizardProvider>
          <AppContent />
        </WizardProvider>
      </VoiceOverProvider>
    </ModeProvider>
  );
}
