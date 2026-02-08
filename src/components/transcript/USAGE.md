# Transcript Feature Usage

This directory contains the transcript download feature for the ML System Design Interview tool.

## Files

- `generateTranscript.ts` - Pure function that generates markdown transcript from path data
- `TranscriptButton.tsx` - React component with download button and toast notification
- `index.ts` - Barrel export for easy imports

## Integration Example

### Option 1: Using with WizardContext

```tsx
import { useWizard } from '@/context/WizardContext';
import { TranscriptButton } from '@/components/transcript';

function MyComponent() {
  const { problem, path, nodeMap } = useWizard();

  return (
    <div>
      {problem && (
        <TranscriptButton
          problem={problem}
          path={path}
          nodeMap={nodeMap}
        />
      )}
    </div>
  );
}
```

### Option 2: Updating QuestionCard.tsx

Replace the existing download button in the terminal node section:

```tsx
// In QuestionCard.tsx, import the button
import { TranscriptButton } from '@/components/transcript';
import { useWizard } from '@/context/WizardContext';

// Inside the component
export function QuestionCard({ node, onSelectChoice, onAdvance, onReset }: QuestionCardProps) {
  const { problem, path, nodeMap } = useWizard();

  // ... existing code ...

  // Replace the terminal node buttons section with:
  {node.type === 'terminal' && (
    <div className="space-y-3">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-800">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Interview Complete</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start Over
        </button>
        {problem && (
          <TranscriptButton
            problem={problem}
            path={path}
            nodeMap={nodeMap}
          />
        )}
      </div>
    </div>
  )}
```

## Transcript Format

The generated markdown file includes:

- Title with problem name
- Date of generation
- Problem description
- Path summary (sequence of choices made)
- Full conversation organized by ML stages:
  - Problem Definition
  - Metrics
  - Data
  - Features
  - Model
  - Training
  - Deployment
  - Monitoring
- Each node shows speaker (Interviewer/Candidate) and content
- Question nodes show the decision point and chosen answer
- Footer with generation attribution

### Example Output

```markdown
# ML System Design Interview: Video Recommendation System

**Date**: 2026-02-07

**Problem**: Design a video recommendation system for a streaming platform.

**Path Summary**: Use engagement metrics → Collaborative filtering → Deploy with A/B testing

---

## Problem Definition

**Interviewer**: Let's design a video recommendation system...

> **Decision**: What metrics should we optimize for?
> **Choice**: Use engagement metrics

**Candidate**: I would focus on engagement metrics like watch time and completion rate...

## Metrics

**Interviewer**: Great choice. Now let's think about the data we'll need...

...
```

## Features

- Automatic file download with descriptive filename: `{problem-id}-transcript-{date}.md`
- Button disabled when no path exists (interview not started)
- Toast notification shows "Downloaded!" for 2 seconds after download
- Clean, accessible UI with proper ARIA labels
- Styled with Tailwind CSS matching the existing design system
