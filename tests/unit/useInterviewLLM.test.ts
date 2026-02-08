import { describe, it, expect } from 'vitest';
import type { InterviewLLMResponse, DialogueLine, TreeNode } from '@/types/tree';
import { dialogueToConversation, repairStage, repairNodes } from '@/hooks/useInterviewLLM';

// Test the response parsing logic extracted from the hook (matches production code)
function tryParseJSON(str: string): Record<string, unknown> | null {
  const trimmed = str.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    let fixed = trimmed;
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    if (!fixed.endsWith('}')) fixed += '}';
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function parseClassifyResponse(raw: string): InterviewLLMResponse {
  const jsonBlockMatch = raw.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : raw;

  const parsed = tryParseJSON(jsonStr);
  if (parsed) {
    const intent = parsed.intent as string;
    if (intent === 'match_choice' || intent === 'clarification' || intent === 'novel_answer') {
      return {
        intent: intent as InterviewLLMResponse['intent'],
        matchedChoiceIndex: (parsed.matchedChoiceIndex ?? parsed.matched_choice_index) as number | undefined,
        interviewerReply: (parsed.interviewerReply || parsed.interviewer_reply || '') as string,
        choiceLabel: (parsed.choiceLabel || parsed.choice_label) as string | undefined,
        choiceAnswer: (parsed.choiceAnswer || parsed.choice_answer) as string | undefined,
      };
    }
  }

  return {
    intent: 'clarification',
    interviewerReply: raw.trim(),
  };
}

describe('useInterviewLLM', () => {
  describe('parseClassifyResponse', () => {
    it('parses match_choice intent correctly', () => {
      const raw = JSON.stringify({
        intent: 'match_choice',
        matchedChoiceIndex: 1,
        interviewerReply: 'That maps to Option B.',
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('match_choice');
      expect(result.matchedChoiceIndex).toBe(1);
      expect(result.interviewerReply).toBe('That maps to Option B.');
    });

    it('parses clarification intent correctly', () => {
      const raw = JSON.stringify({
        intent: 'clarification',
        interviewerReply: 'Could you elaborate on what you mean?',
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('clarification');
      expect(result.interviewerReply).toBe('Could you elaborate on what you mean?');
      expect(result.matchedChoiceIndex).toBeUndefined();
    });

    it('parses novel_answer intent with choice metadata', () => {
      const raw = JSON.stringify({
        intent: 'novel_answer',
        interviewerReply: 'Interesting approach! Let me create a branch for that.',
        choiceLabel: 'Hybrid approach',
        choiceAnswer: 'Combining collaborative and content-based filtering',
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('novel_answer');
      expect(result.choiceLabel).toBe('Hybrid approach');
      expect(result.choiceAnswer).toBe('Combining collaborative and content-based filtering');
    });

    it('handles JSON wrapped in markdown code blocks', () => {
      const raw = '```json\n{"intent":"match_choice","matchedChoiceIndex":0,"interviewerReply":"Great!"}\n```';

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('match_choice');
      expect(result.matchedChoiceIndex).toBe(0);
      expect(result.interviewerReply).toBe('Great!');
    });

    it('handles snake_case field names', () => {
      const raw = JSON.stringify({
        intent: 'novel_answer',
        interviewer_reply: 'Interesting!',
        choice_label: 'New option',
        choice_answer: 'A new approach',
        matched_choice_index: 2,
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('novel_answer');
      expect(result.interviewerReply).toBe('Interesting!');
      expect(result.choiceLabel).toBe('New option');
      expect(result.choiceAnswer).toBe('A new approach');
    });

    it('falls back to clarification for invalid JSON', () => {
      const raw = 'This is not valid JSON but a plain text response';

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('clarification');
      expect(result.interviewerReply).toBe(raw);
    });

    it('falls back to clarification for unknown intent', () => {
      const raw = JSON.stringify({
        intent: 'unknown_intent',
        interviewerReply: 'Something',
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('clarification');
    });

    it('handles empty interviewerReply gracefully', () => {
      const raw = JSON.stringify({
        intent: 'clarification',
        interviewerReply: '',
      });

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('clarification');
      expect(result.interviewerReply).toBe('');
    });

    it('handles truncated JSON missing closing brace (thinking model token exhaustion)', () => {
      const raw = '{\n  "intent": "novel_answer",\n  "choiceLabel": "Quantile Regression",\n  "choiceAnswer": "Predict delay distribution",\n  "interviewerReply": "Great approach!"';

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('novel_answer');
      expect(result.choiceLabel).toBe('Quantile Regression');
      expect(result.interviewerReply).toBe('Great approach!');
    });

    it('handles truncated JSON with incomplete string value', () => {
      const raw = '{\n  "intent": "novel_answer",\n  "choiceLabel": "Test",\n  "choiceAnswer": "Some answer",\n  "interviewerReply": "This is a trun';

      const result = parseClassifyResponse(raw);
      expect(result.intent).toBe('novel_answer');
      expect(result.choiceLabel).toBe('Test');
    });
  });

  describe('dialogueToConversation', () => {
    it('converts dialogue lines to conversation entries', () => {
      const lines: DialogueLine[] = [
        { speaker: 'interviewer', text: 'What approach would you use?' },
        { speaker: 'candidate', text: 'I would use collaborative filtering.' },
        { speaker: 'interviewer', text: 'Good choice. Why?' },
      ];

      const result = dialogueToConversation(lines);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ role: 'assistant', content: 'What approach would you use?' });
      expect(result[1]).toEqual({ role: 'user', content: 'I would use collaborative filtering.' });
      expect(result[2]).toEqual({ role: 'assistant', content: 'Good choice. Why?' });
    });

    it('handles empty dialogue', () => {
      const result = dialogueToConversation([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('repairStage', () => {
    it('passes through valid stages unchanged', () => {
      expect(repairStage('data')).toBe('data');
      expect(repairStage('metrics')).toBe('metrics');
      expect(repairStage('problem_definition')).toBe('problem_definition');
      expect(repairStage('monitoring')).toBe('monitoring');
    });

    it('fixes common LLM hallucinations', () => {
      expect(repairStage('problem_formulation')).toBe('problem_definition');
      expect(repairStage('evaluation_metrics')).toBe('metrics');
      expect(repairStage('feature_engineering')).toBe('features');
      expect(repairStage('data_collection')).toBe('data');
      expect(repairStage('model_selection')).toBe('model');
      expect(repairStage('serving')).toBe('deployment');
      expect(repairStage('observability')).toBe('monitoring');
    });

    it('handles case insensitivity', () => {
      expect(repairStage('Data')).toBe('data');
      expect(repairStage('METRICS')).toBe('metrics');
      expect(repairStage('Problem_Definition')).toBe('problem_definition');
    });

    it('uses substring matching for partial matches', () => {
      expect(repairStage('data_stuff')).toBe('data');
      expect(repairStage('model_architecture')).toBe('model');
    });

    it('defaults to monitoring for completely unknown stages', () => {
      expect(repairStage('banana')).toBe('monitoring');
      expect(repairStage('')).toBe('monitoring');
    });
  });

  describe('repairNodes', () => {
    it('fixes invalid stages on nodes', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'problem_formulation' as never, type: 'info', label: 'Start', speaker: 'interviewer', content: 'Hello', next: 'n2' },
        { id: 'n2', stage: 'feature_engineering' as never, type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
      ];

      const repaired = repairNodes(nodes);
      expect(repaired[0].stage).toBe('problem_definition');
      expect(repaired[1].stage).toBe('features');
    });

    it('fixes invalid node types', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'data', type: 'invalid_type' as never, label: 'Node', speaker: 'interviewer', content: 'Content', next: 'n2' },
        { id: 'n2', stage: 'monitoring', type: 'invalid_type' as never, label: 'Last', speaker: 'interviewer', content: 'End' },
      ];

      const repaired = repairNodes(nodes);
      expect(repaired[0].type).toBe('info'); // not last → info
      expect(repaired[1].type).toBe('terminal'); // last → terminal
    });

    it('fixes invalid speaker', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'data', type: 'terminal', label: 'Node', speaker: 'unknown' as never, content: 'Content' },
      ];

      const repaired = repairNodes(nodes);
      expect(repaired[0].speaker).toBe('interviewer');
    });

    it('ensures info nodes have next pointing to subsequent node', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'data', type: 'info', label: 'Node', speaker: 'interviewer', content: 'C' },
        { id: 'n2', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'D' },
      ];

      const repaired = repairNodes(nodes);
      expect(repaired[0].next).toBe('n2');
    });

    it('removes next and choices from terminal nodes', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'D', next: 'bogus', choices: [] },
      ];

      const repaired = repairNodes(nodes);
      expect(repaired[0].next).toBeUndefined();
      expect(repaired[0].choices).toBeUndefined();
    });

    it('fixes choice fields to be strings', () => {
      const nodes: TreeNode[] = [
        { id: 'n1', stage: 'model', type: 'question', label: 'Pick', speaker: 'interviewer', content: 'Choose',
          choices: [
            { label: 123 as never, answer: null as never, next: 'n2' },
            { label: 'Valid', answer: 'Valid answer', next: 'n2' },
          ] },
        { id: 'n2', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
      ];

      const repaired = repairNodes(nodes);
      expect(typeof repaired[0].choices![0].label).toBe('string');
      expect(typeof repaired[0].choices![0].answer).toBe('string');
    });
  });
});
