import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { stringify } from 'yaml';
import { useWizardState } from '@/hooks/useWizardState';
import { useVoiceOver } from '@/hooks/useVoiceOver';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useMode } from '@/hooks/useMode';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useNodeComments } from '@/hooks/useNodeComments';
import { useInterviewLLM, dialogueToConversation } from '@/hooks/useInterviewLLM';
import { useHandsFree, useHandsFreeCallbacks } from '@/context/HandsFreeContext';
import { mergeBranch, validateConvergenceRefs } from '@/utils/mergeBranch';
import { getDownstreamSummaries } from '@/utils/treeTraversal';
import { submitBranchForModeration } from '@/utils/branchModeration';
import { isDraft, saveDraftProblem } from '@/utils/draftStore';
import { useAuth } from '@/hooks/useAuth';
import { useSources } from '@/hooks/useSources';
import { StageIndicator } from './StageIndicator';
import { PathBreadcrumb } from './PathBreadcrumb';
import { QuestionCard } from './QuestionCard';
import { MultiSelectCard } from './MultiSelectCard';
import { VoiceOverControls } from './VoiceOverControls';
import { NotesPanel } from './NotesPanel';
import { SourcesPanel } from './SourcesPanel';
import type { MLStage, DialogueLine, InterviewLLMResponse } from '@/types/tree';

const STAGE_BORDER_COLORS: Record<string, string> = {
  problem_definition: 'rgb(59, 130, 246)',
  metrics: 'rgb(168, 85, 247)',
  data: 'rgb(34, 197, 94)',
  features: 'rgb(251, 191, 36)',
  model: 'rgb(239, 68, 68)',
  training: 'rgb(249, 115, 22)',
  deployment: 'rgb(6, 182, 212)',
  monitoring: 'rgb(236, 72, 153)',
};

function getBorderColorForStage(stage: string): string {
  return STAGE_BORDER_COLORS[stage] || 'rgb(156, 163, 175)';
}

interface PauseState {
  choiceIndex: number;
  choiceLabel: string;
  answerText: string;
}

export function WizardPanel() {
  const {
    problem,
    currentNode,
    path,
    visitedNodeIds,
    nodeMap,
    selectChoice,
    submitMultiSelect,
    advance,
    goBack,
    reset,
    updateProblem,
    appendDialogue,
  } = useWizardState();

  const { user } = useAuth();
  const voiceOver = useVoiceOver();
  const { config } = useMode();
  const speechRecognition = useSpeechRecognition();
  const handsFree = useHandsFree();
  const { addComment } = useNodeComments(problem?.id || '', currentNode?.id || '');
  const sourcesHook = useSources(problem?.id || '');
  const previousNodeIdRef = useRef<string | null>(null);
  const previousModeRef = useRef<string>(config.mode);
  const dialogueCancelRef = useRef(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [voiceInputTranscript, setVoiceInputTranscript] = useState<string | null>(null);
  const [pauseState, setPauseState] = useState<PauseState | null>(null);
  const [pauseQuestion, setPauseQuestion] = useState('');
  const [liveDialogue, setLiveDialogue] = useState<DialogueLine[]>([]);
  const [branchGenerating, setBranchGenerating] = useState(false);
  const [pendingNovelChoice, setPendingNovelChoice] = useState<{ label: string; answer: string } | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const interviewLLM = useInterviewLLM();

  // Enable keyboard navigation
  useKeyboardNav(true);

  // Speak dialogue lines sequentially with pauses between turns
  const speakDialogueSequentially = useCallback(
    (lines: DialogueLine[], onAllDone?: () => void) => {
      dialogueCancelRef.current = false;
      let index = 0;

      const speakNext = () => {
        if (dialogueCancelRef.current || index >= lines.length) {
          if (!dialogueCancelRef.current && onAllDone) onAllDone();
          return;
        }

        const line = lines[index];
        index++;

        voiceOver.speak(line.text, line.speaker, () => {
          if (dialogueCancelRef.current) return;
          // 800ms pause between turns
          setTimeout(() => {
            if (!dialogueCancelRef.current) speakNext();
          }, 800);
        });
      };

      speakNext();
    },
    [voiceOver]
  );

  // Calculate visited stages from the path and current node
  const visitedStages = useMemo(() => {
    const stages = new Set<MLStage>();

    // Add stages from all visited nodes
    visitedNodeIds.forEach(nodeId => {
      const node = nodeMap.get(nodeId);
      if (node) {
        stages.add(node.stage);
      }
    });

    return stages;
  }, [visitedNodeIds, nodeMap]);

  // Clear pause state and live dialogue when node changes
  useEffect(() => {
    setPauseState(null);
    setPauseQuestion('');
    setLiveDialogue([]);
  }, [currentNode?.id]);

  // Stop speech when mode changes — prevent overlapping voices
  useEffect(() => {
    if (previousModeRef.current !== config.mode) {
      previousModeRef.current = config.mode;
      dialogueCancelRef.current = true;
      voiceOver.stop();
      // Reset node tracking so we don't auto-speak the same node again after mode switch
      previousNodeIdRef.current = currentNode?.id ?? null;
    }
  }, [config.mode, voiceOver, currentNode?.id]);

  // Auto-speak when node changes
  useEffect(() => {
    if (!currentNode || !voiceOver.enabled || !voiceOver.isSupported) return;

    // Only speak if the node actually changed
    if (previousNodeIdRef.current === currentNode.id) return;
    previousNodeIdRef.current = currentNode.id;

    // Cancel any in-progress dialogue sequence
    dialogueCancelRef.current = true;

    // Stop any current speech
    voiceOver.stop();

    // Use dialogue mode if available and enabled
    const useDialogueMode = config.useDialogue && currentNode.dialogue && currentNode.dialogue.length > 0;

    if (useDialogueMode) {
      // Speak dialogue lines sequentially
      const onDone = (currentNode.type === 'info' && currentNode.next && voiceOver.autoAdvance)
        ? () => { advance(); }
        : undefined;
      speakDialogueSequentially(currentNode.dialogue!, onDone);
    } else {
      // Speak the node content as a single block
      const textToSpeak = `${currentNode.label}. ${currentNode.content}`;

      // For info nodes with auto-advance enabled, auto-advance after speaking
      if (currentNode.type === 'info' && currentNode.next && voiceOver.autoAdvance) {
        voiceOver.speak(textToSpeak, currentNode.speaker, () => {
          advance();
        });
      } else {
        voiceOver.speak(textToSpeak, currentNode.speaker);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode, voiceOver.enabled, voiceOver.autoAdvance, voiceOver.isSupported, voiceOver.speak, voiceOver.stop, config.useDialogue, speakDialogueSequentially]);

  // Stop speech when going back
  const handleGoBack = () => {
    dialogueCancelRef.current = true;
    voiceOver.stop();
    goBack();
  };

  const handleReset = () => {
    dialogueCancelRef.current = true;
    voiceOver.stop();
    reset();
  };

  // Handle choice selection with voice-over and tutor pause
  const handleSelectChoice = (index: number) => {
    if (!currentNode || currentNode.type !== 'question' || !currentNode.choices) return;

    const choice = currentNode.choices[index];
    if (!choice) return;

    // Stop current speech
    voiceOver.stop();

    // Tutor mode: pause for understanding
    if (config.pauseForUnderstanding && choice.answer) {
      // Speak the answer, then show pause UI
      if (voiceOver.enabled && voiceOver.isSupported) {
        const answerText = `${choice.label}. ${choice.answer}`;
        voiceOver.speak(answerText, 'candidate', () => {
          setPauseState({
            choiceIndex: index,
            choiceLabel: choice.label,
            answerText: choice.answer,
          });
        });
      } else {
        // No voice — show pause UI immediately
        setPauseState({
          choiceIndex: index,
          choiceLabel: choice.label,
          answerText: choice.answer,
        });
      }
      return;
    }

    // Non-tutor mode: speak then navigate (or navigate immediately)
    if (voiceOver.enabled && voiceOver.isSupported && choice.answer) {
      const answerText = `${choice.label}. ${choice.answer}`;
      voiceOver.speak(answerText, 'candidate', () => {
        selectChoice(index);
      });
    } else {
      selectChoice(index);
    }
  };

  // Handle continuing after tutor pause
  const handlePauseContinue = () => {
    if (!pauseState) return;
    const idx = pauseState.choiceIndex;
    setPauseState(null);
    setPauseQuestion('');
    selectChoice(idx);
  };

  // Handle submitting a question during tutor pause
  const handlePauseAskQuestion = async () => {
    if (!pauseQuestion.trim() || !problem || !currentNode) return;
    const authorName = localStorage.getItem('comment_author') || 'Anonymous';
    await addComment(pauseQuestion.trim(), authorName, 'question');
    setPauseQuestion('');
    if (voiceOver.enabled && voiceOver.isSupported) {
      voiceOver.speak('Question recorded. Take your time.', 'interviewer');
    }
  };

  // Handle multi-select submission
  const handleMultiSelect = (selections: Record<string, string>) => {
    voiceOver.stop();
    submitMultiSelect(selections);
  };

  // Handle voice input
  const handleVoiceInputToggle = () => {
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
      if (speechRecognition.transcript) {
        setVoiceInputTranscript(speechRecognition.transcript);
      }
    } else {
      setVoiceInputTranscript(null);
      speechRecognition.startListening();
    }
  };

  const handleSaveVoiceInput = async () => {
    if (!voiceInputTranscript || !problem || !currentNode) return;
    const authorName = localStorage.getItem('comment_author') || 'Anonymous';
    await addComment(voiceInputTranscript, authorName, 'question');
    setVoiceInputTranscript(null);
    if (voiceOver.enabled && voiceOver.isSupported) {
      voiceOver.speak('Question recorded', 'candidate');
    }
  };

  // Handle freeform interview response
  const handleFreeformSubmit = useCallback(async (userText: string) => {
    if (!currentNode || !problem) return;

    const candidateLine: DialogueLine = { speaker: 'candidate', text: userText };
    setLiveDialogue(prev => [...prev, candidateLine]);

    const allDialogue = [...(currentNode.dialogue || []), ...liveDialogue, candidateLine];
    const conversationHistory = dialogueToConversation(allDialogue);

    const response = await interviewLLM.classifyAndRespond({
      userText,
      nodeLabel: currentNode.label,
      nodeContent: currentNode.content,
      nodeStage: currentNode.stage,
      choices: currentNode.choices || [],
      conversationHistory,
      problemTitle: problem.title,
      sources: sourcesHook.sources.length > 0 ? sourcesHook.sources : undefined,
    });

    if (!response) return;

    const interviewerLine: DialogueLine = { speaker: 'interviewer', text: response.interviewerReply };
    const newLines = [candidateLine, interviewerLine];

    setLiveDialogue(prev => [...prev, interviewerLine]);
    appendDialogue(currentNode.id, newLines);

    // Speak the interviewer reply
    if (voiceOver.enabled && voiceOver.isSupported) {
      voiceOver.speak(response.interviewerReply, 'interviewer');
    }

    // Handle intent
    if (response.intent === 'match_choice' && response.matchedChoiceIndex !== undefined) {
      setTimeout(() => {
        selectChoice(response.matchedChoiceIndex!);
      }, 2000);
    } else if (response.intent === 'novel_answer' && response.choiceLabel && response.choiceAnswer) {
      handleNovelAnswer(response);
    }
    // clarification: stay on node, user continues chatting
  }, [currentNode, problem, liveDialogue, interviewLLM, appendDialogue, voiceOver, selectChoice, sourcesHook.sources]);

  // Re-speak current node content or dialogue
  const respeakCurrentNode = useCallback(() => {
    if (!currentNode) return;
    voiceOver.stop();
    const useDialogueMode = config.useDialogue && currentNode.dialogue && currentNode.dialogue.length > 0;
    if (useDialogueMode) {
      speakDialogueSequentially(currentNode.dialogue!);
    } else {
      voiceOver.speak(`${currentNode.label}. ${currentNode.content}`, currentNode.speaker);
    }
  }, [currentNode, voiceOver, config.useDialogue, speakDialogueSequentially]);

  // Hands-free command dispatch
  useHandsFreeCallbacks({
    onCommand: (cmd) => {
      switch (cmd.type) {
        case 'continue':
          advance();
          break;
        case 'go_back':
          handleGoBack();
          break;
        case 'repeat':
          respeakCurrentNode();
          break;
        case 'select_option':
          if (
            currentNode?.type === 'question' &&
            currentNode.choices &&
            cmd.optionIndex !== undefined &&
            cmd.optionIndex < currentNode.choices.length
          ) {
            handleSelectChoice(cmd.optionIndex);
          }
          break;
        case 'reset':
          handleReset();
          break;
        case 'pause':
          // Stop all speech + cancel dialogue sequence
          // (recognition can only capture "pause" after TTS ends, so this
          //  prevents the next auto-advance and any pending speech)
          dialogueCancelRef.current = true;
          voiceOver.stop();
          break;
        case 'resume':
          // Re-speak current node from the beginning
          respeakCurrentNode();
          break;
      }
    },
    onFreeformText: (text) => {
      handleFreeformSubmit(text);
    },
  });

  const handleNovelAnswer = useCallback(async (response: InterviewLLMResponse) => {
    if (!currentNode || !problem || !response.choiceLabel || !response.choiceAnswer) return;

    setBranchGenerating(true);
    setBranchError(null);
    setPendingNovelChoice({ label: response.choiceLabel, answer: response.choiceAnswer });
    try {
      // Gather downstream context for convergence
      const downstreamContext = getDownstreamSummaries(problem, currentNode.id);

      const branchSources = sourcesHook.sources.length > 0 ? sourcesHook.sources : undefined;

      let newNodes = await interviewLLM.generateBranch({
        choiceLabel: response.choiceLabel,
        choiceAnswer: response.choiceAnswer,
        targetNodeId: currentNode.id,
        targetNodeStage: currentNode.stage,
        problemTitle: problem.title,
        existingYaml: stringify(problem),
        downstreamContext,
        sources: branchSources,
      });

      // Validate convergence references before merging
      const existingIds = new Set(problem.nodes.map(n => n.id));
      const newNodeIds = new Set(newNodes.map(n => n.id));
      const convergenceErrors = validateConvergenceRefs(newNodes, existingIds, newNodeIds);

      if (convergenceErrors.length > 0) {
        // Fall back: regenerate without convergence context
        console.warn('Convergence validation failed, regenerating without convergence:', convergenceErrors);
        newNodes = await interviewLLM.generateBranch({
          choiceLabel: response.choiceLabel,
          choiceAnswer: response.choiceAnswer,
          targetNodeId: currentNode.id,
          targetNodeStage: currentNode.stage,
          problemTitle: problem.title,
          existingYaml: stringify(problem),
          sources: branchSources,
        });
      }

      const merged = mergeBranch({
        existingProblem: problem,
        newNodes,
        targetNodeId: currentNode.id,
        editType: currentNode.type === 'question' ? 'add-choice' : 'add-decision',
        choiceLabel: response.choiceLabel,
        choiceAnswer: response.choiceAnswer,
      });

      updateProblem(merged);

      // Submit branch for moderation (fire-and-forget)
      submitBranchForModeration({
        problemId: problem.id,
        targetNodeId: currentNode.id,
        choiceLabel: response.choiceLabel,
        choiceAnswer: response.choiceAnswer,
        newNodes,
        authorId: user?.id,
        authorName: user?.email || 'Anonymous',
      }).catch(console.error);

      // Navigate to the new branch after a brief delay
      const newChoice = merged.nodes
        .find(n => n.id === currentNode.id)
        ?.choices?.find(c => c.label === response.choiceLabel);

      // Clear pending choice — it's now a real choice in the merged tree
      setPendingNovelChoice(null);

      if (newChoice) {
        setTimeout(() => {
          const choiceIdx = merged.nodes
            .find(n => n.id === currentNode.id)
            ?.choices?.findIndex(c => c.label === response.choiceLabel);
          if (choiceIdx !== undefined && choiceIdx >= 0) {
            selectChoice(choiceIdx);
          }
        }, 1500);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to generate novel branch:', errMsg, err);
      setBranchError(`Branch generation failed: ${errMsg || 'The LLM output could not be validated. Try rephrasing or use a larger model.'}`);
    } finally {
      setBranchGenerating(false);
    }
  }, [currentNode, problem, interviewLLM, updateProblem, selectChoice, user, sourcesHook.sources]);

  // Auto-save problem to localStorage (drafts use draftStore, others use enhanced_problem_)
  useEffect(() => {
    if (!problem) return;

    const timer = setTimeout(() => {
      try {
        if (isDraft(problem.id)) {
          saveDraftProblem(problem);
        } else {
          localStorage.setItem(`enhanced_problem_${problem.id}`, JSON.stringify(problem));
        }
      } catch {
        // localStorage full or unavailable
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [problem]);

  const handlePlayPause = () => {
    if (voiceOver.isPaused) {
      voiceOver.resume();
    } else if (voiceOver.isPlaying) {
      voiceOver.pause();
    }
  };

  if (!problem || !currentNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Problem Selected</h3>
          <p className="text-gray-600">Select a problem to begin the interview</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="wizard-panel" className="flex flex-col h-full bg-gray-100">
      {/* Stage Indicator */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <StageIndicator currentStage={currentNode.stage} visitedStages={visitedStages} />
      </div>

      {/* Voice-Over Controls */}
      {voiceOver.isSupported && voiceOver.enabled && (
        <VoiceOverControls
          isPlaying={voiceOver.isPlaying}
          isPaused={voiceOver.isPaused}
          rate={voiceOver.rate}
          autoAdvance={voiceOver.autoAdvance}
          currentSpeaker={voiceOver.currentSpeaker}
          onPlayPause={handlePlayPause}
          onStop={voiceOver.stop}
          onRateChange={voiceOver.setRate}
          onAutoAdvanceToggle={() => voiceOver.setAutoAdvance(!voiceOver.autoAdvance)}
          ttsProvider={voiceOver.ttsProvider}
          onProviderChange={voiceOver.setTTSProvider}
          modelLoading={voiceOver.modelLoading}
          modelProgress={voiceOver.modelProgress}
          modelStatus={voiceOver.modelStatus}
          modelReady={voiceOver.modelReady}
          onLoadModel={voiceOver.loadModel}
          kokoroVoices={voiceOver.kokoroVoices}
          kokoroInterviewerVoice={voiceOver.kokoroInterviewerVoice}
          kokoroCandidateVoice={voiceOver.kokoroCandidateVoice}
          onKokoroInterviewerVoiceChange={voiceOver.setKokoroInterviewerVoice}
          onKokoroCandidateVoiceChange={voiceOver.setKokoroCandidateVoice}
        />
      )}

      {/* Path Breadcrumb */}
      <PathBreadcrumb path={path} nodeMap={nodeMap} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
          {/* Back Button */}
          {path.length > 0 && (
            <div className="mb-4">
              <button
                onClick={handleGoBack}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-white transition-colors duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
          )}

          {/* Pending node loading state — shown when background generation hasn't filled this node yet */}
          {(currentNode.content.startsWith('[FILL:') || currentNode.label.startsWith('[FILL:')) ? (
            <div
              className="bg-white rounded-xl shadow-sm border-2 p-8 text-center"
              style={{ borderColor: getBorderColorForStage(currentNode.stage) }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Content generating...</h3>
                  <p className="text-sm text-gray-500">
                    This stage is being filled in the background. It will appear automatically.
                  </p>
                </div>
              </div>
            </div>
          ) : currentNode.type === 'multi_select' ? (
            <MultiSelectCard
              node={currentNode}
              problemTitle={problem.title}
              onSubmit={handleMultiSelect}
              stageColor={currentNode.stage}
              borderColor={getBorderColorForStage(currentNode.stage)}
            />
          ) : (
            <QuestionCard
              node={currentNode}
              problemId={problem.id}
              onSelectChoice={handleSelectChoice}
              onAdvance={advance}
              onReset={handleReset}
              liveDialogue={liveDialogue}
              isTyping={interviewLLM.loading}
              onFreeformSubmit={handleFreeformSubmit}
              freeformLoading={interviewLLM.loading}
              pendingNovelChoice={pendingNovelChoice}
              branchGenerating={branchGenerating}
              branchError={branchError}
              onDismissError={() => { setBranchError(null); setPendingNovelChoice(null); }}
              sources={sourcesHook.sources.length > 0 ? sourcesHook.sources : undefined}
              handsFreeActive={handsFree.enabled}
            />
          )}

          {/* Branch Error (standalone, shown after QuestionCard) */}

          {/* Tutor Mode: Pause for Understanding */}
          {pauseState && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">
                    Take a moment to understand this answer
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    <span className="font-medium">{pauseState.choiceLabel}:</span>{' '}
                    {pauseState.answerText}
                  </p>

                  {/* Question input */}
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pauseQuestion}
                        onChange={(e) => setPauseQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && pauseQuestion.trim()) {
                            handlePauseAskQuestion();
                          }
                        }}
                        placeholder="Have a question? Type it here..."
                        className="flex-1 text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      />
                      <button
                        onClick={handlePauseAskQuestion}
                        disabled={!pauseQuestion.trim()}
                        className="px-3 py-1.5 text-sm font-medium bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ask
                      </button>
                    </div>
                  </div>

                  {/* Continue button */}
                  <button
                    onClick={handlePauseContinue}
                    className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                  >
                    I understand, continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Input — hidden when hands-free is active (it owns the mic) */}
          {!handsFree.enabled && speechRecognition.isSupported && (config.mode === 'mock_interview' || config.mode === 'tutor') && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleVoiceInputToggle}
                  className={`
                    flex items-center justify-center rounded-full transition-all duration-200
                    ${config.drivingFriendly ? 'w-16 h-16' : 'w-12 h-12'}
                    ${speechRecognition.isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
                  `}
                  title={speechRecognition.isListening ? 'Stop recording' : 'Record a question'}
                >
                  <svg className={config.drivingFriendly ? 'w-8 h-8' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                {speechRecognition.isListening && (
                  <span className="text-sm text-red-600 font-medium">
                    {speechRecognition.interimTranscript || 'Listening...'}
                  </span>
                )}
              </div>
              {voiceInputTranscript && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-800 mb-2">&quot;{voiceInputTranscript}&quot;</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveVoiceInput}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Save as Question
                    </button>
                    <button
                      onClick={() => setVoiceInputTranscript(null)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Node Metadata (for development/debugging) */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Node: {currentNode.id} | Stage: {currentNode.stage} | Type: {currentNode.type}
          </div>

          {/* Keyboard Shortcuts Hint */}
          {config.showKeyboardHints && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg hidden md:block">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700">Keyboard Shortcuts</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSourcesOpen(!sourcesOpen); if (!sourcesOpen) setNotesOpen(false); }}
                    className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      sourcesOpen ? 'bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Sources{sourcesHook.sources.length > 0 ? ` (${sourcesHook.sources.length})` : ''}
                  </button>
                  {config.showNotes && (
                    <button
                      onClick={() => { setNotesOpen(!notesOpen); if (!notesOpen) setSourcesOpen(false); }}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                <div><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">1-9</kbd> Select choice</div>
                <div><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> Continue</div>
                <div><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Backspace</kbd> Back</div>
                <div><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">R</kbd> Reset</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sources Panel */}
      {problem && (
        <SourcesPanel
          isOpen={sourcesOpen}
          onClose={() => setSourcesOpen(false)}
          sources={sourcesHook.sources}
          loading={sourcesHook.loading}
          error={sourcesHook.error}
          searchResults={sourcesHook.searchResults}
          searchLoading={sourcesHook.searchLoading}
          onAddUrl={sourcesHook.addUrl}
          onAddText={sourcesHook.addText}
          onRemoveSource={sourcesHook.removeSource}
          onAutoSearch={sourcesHook.autoSearch}
          onAddSearchResult={sourcesHook.addSearchResult}
          onSummarizeSource={sourcesHook.summarizeSource}
          onClearSources={sourcesHook.clearSources}
          problemTitle={problem.title}
        />
      )}

      {/* Notes Panel */}
      {problem && (
        <NotesPanel
          problemId={problem.id}
          isOpen={notesOpen}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </div>
  );
}
