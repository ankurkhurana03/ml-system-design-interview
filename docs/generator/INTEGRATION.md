# LLM Tree Generator - Integration Guide

This guide shows how to integrate the LLM tree generator feature into your ML System Design Interview app.

## Quick Start

### 1. Deploy the Supabase Edge Function

```bash
cd /Users/ankur/Downloads/ml_sys_design
supabase functions deploy generate-tree
```

### 2. Run Database Migrations

```bash
supabase migration up
```

This will create the necessary tables:
- `user_settings` - Stores user LLM API configuration
- `user_drafts` - Stores generated problem drafts

### 3. Import and Use Components

```tsx
import { GenerateModal, PreviewTree, PublishButton } from '@/components/generator';
```

## Integration Examples

### Simple Integration (Modal Button)

Add a "Generate" button to your app that opens the modal:

```tsx
import { useState } from 'react';
import { GenerateModal } from '@/components/generator';
import type { Problem } from '@/types/tree';

function App() {
  const [showGenerate, setShowGenerate] = useState(false);

  const handleGenerated = (problem: Problem) => {
    // Load the problem into your app
    console.log('Generated:', problem);
    // You might want to:
    // - Navigate to the problem view
    // - Add it to a list of problems
    // - Save it to localStorage
  };

  return (
    <div>
      <button onClick={() => setShowGenerate(true)}>
        Generate New Problem
      </button>

      <GenerateModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
```

### Full Workflow Integration

For a complete generator workflow with preview and publish:

```tsx
import { GeneratorExample } from '@/components/generator';

function GeneratorPage() {
  return <GeneratorExample />;
}
```

Or create your own workflow:

```tsx
import { useState } from 'react';
import { GenerateModal, PreviewTree, PublishButton } from '@/components/generator';
import type { Problem } from '@/types/tree';

function GeneratorWorkflow() {
  const [step, setStep] = useState<'generate' | 'preview' | 'publish'>('generate');
  const [problem, setProblem] = useState<Problem | null>(null);

  const handleGenerated = (newProblem: Problem) => {
    setProblem(newProblem);
    setStep('preview');
  };

  const handleAccept = () => {
    setStep('publish');
  };

  const handleDiscard = () => {
    setProblem(null);
    setStep('generate');
  };

  const handlePublished = () => {
    // Reset or navigate away
    setProblem(null);
    setStep('generate');
  };

  return (
    <div>
      {step === 'generate' && (
        <GenerateModal
          isOpen={true}
          onClose={() => {}}
          onGenerated={handleGenerated}
        />
      )}

      {step === 'preview' && problem && (
        <PreviewTree
          problem={problem}
          onAccept={handleAccept}
          onEdit={() => {}}
          onDiscard={handleDiscard}
        />
      )}

      {step === 'publish' && problem && (
        <div>
          <h2>Ready to Publish</h2>
          <PublishButton
            problem={problem}
            onPublished={handlePublished}
          />
        </div>
      )}
    </div>
  );
}
```

### Add to Sidebar

Add a generator link to your existing sidebar:

```tsx
// In your Sidebar component
<nav>
  <a href="/">Home</a>
  <a href="/problems">Problems</a>
  <a href="/generate">Generate New</a>  {/* Add this */}
</nav>
```

## Configuration

### User Settings (Authenticated)

Users can store their LLM API settings in the database. Create a settings page:

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    llm_base_url: 'https://api.openai.com/v1',
    llm_model: 'gpt-4o',
    llm_api_key: '',
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings({
        llm_base_url: data.llm_base_url || '',
        llm_model: data.llm_model || '',
        llm_api_key: data.llm_api_key_encrypted || '',
      });
    }
  };

  const handleSave = async () => {
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        llm_base_url: settings.llm_base_url,
        llm_model: settings.llm_model,
        llm_api_key_encrypted: settings.llm_api_key,
        updated_at: new Date().toISOString(),
      });
  };

  return (
    <div>
      <h2>LLM Settings</h2>
      <label>
        Base URL:
        <input
          value={settings.llm_base_url}
          onChange={(e) => setSettings({ ...settings, llm_base_url: e.target.value })}
        />
      </label>
      <label>
        Model:
        <input
          value={settings.llm_model}
          onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
        />
      </label>
      <label>
        API Key:
        <input
          type="password"
          value={settings.llm_api_key}
          onChange={(e) => setSettings({ ...settings, llm_api_key: e.target.value })}
        />
      </label>
      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
}
```

### Guest Settings (localStorage)

For users who aren't signed in, store settings in localStorage:

```tsx
function GuestSettingsDialog() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('llm_base_url') || 'https://api.openai.com/v1');
  const [model, setModel] = useState(() => localStorage.getItem('llm_model') || 'gpt-4o');

  const handleSave = () => {
    localStorage.setItem('llm_api_key', apiKey);
    localStorage.setItem('llm_base_url', baseUrl);
    localStorage.setItem('llm_model', model);
  };

  return (
    <div>
      <h3>Configure LLM (Guest Mode)</h3>
      <p>Your settings are stored locally in your browser.</p>
      {/* Form inputs */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

## Viewing User Drafts

Create a drafts page to view published problems:

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { parseYaml } from '@/utils/yamlLoader';
import type { Problem } from '@/types/tree';

function DraftsPage() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  const loadDrafts = async () => {
    const { data } = await supabase
      .from('user_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setDrafts(data || []);
  };

  const handleLoad = (draft: any) => {
    const problem = parseYaml(draft.yaml_content);
    // Navigate to the problem or load it into the editor
    console.log('Loading problem:', problem);
  };

  return (
    <div>
      <h1>My Drafts</h1>
      <div>
        {drafts.map((draft) => (
          <div key={draft.id}>
            <h3>{draft.title}</h3>
            <p>{draft.description}</p>
            <button onClick={() => handleLoad(draft)}>Load</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API Configuration

### Supported LLM Providers

The generator works with any OpenAI-compatible API:

**OpenAI:**
- Base URL: `https://api.openai.com/v1`
- Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

**Anthropic (via proxy):**
- Base URL: Your proxy URL
- Models: `claude-3-opus`, `claude-3-sonnet`

**Local Models (via LM Studio, Ollama, etc.):**
- Base URL: `http://localhost:1234/v1`
- Models: `local-model-name`

**Azure OpenAI:**
- Base URL: `https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT`
- Models: Your deployment name

## Error Handling

The components handle common errors gracefully:

- **No API Key**: Shows a helpful message
- **Invalid YAML**: Shows parsing errors with context
- **Validation Errors**: Lists all validation issues
- **Network Errors**: Provides retry option

You can add global error tracking:

```tsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Listen for generator errors
    window.addEventListener('generator-error', (event) => {
      console.error('Generator error:', event.detail);
      // Send to your error tracking service
    });
  }, []);

  // ... rest of your app
}
```

## Testing

To test the generator without using LLM credits:

1. Create a mock YAML file
2. Paste it directly into the preview editor
3. Test the validation and publish flow

Example test YAML:

```yaml
id: test-problem
title: Test Problem
description: A test problem for validation
root: node1
nodes:
  - id: node1
    stage: problem_definition
    type: info
    label: Start
    speaker: interviewer
    content: "Let's begin..."
    next: node2
  - id: node2
    stage: monitoring
    type: terminal
    label: End
    speaker: interviewer
    content: "Great work!"
```

## Performance Tips

1. **Streaming**: For large trees, consider implementing streaming responses
2. **Caching**: Cache generated trees in localStorage before publishing
3. **Debouncing**: Debounce YAML editor changes during validation
4. **Lazy Loading**: Load the generator components only when needed

```tsx
import { lazy, Suspense } from 'react';

const GenerateModal = lazy(() => import('@/components/generator').then(m => ({ default: m.GenerateModal })));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerateModal {...props} />
    </Suspense>
  );
}
```

## Next Steps

1. Deploy the edge function: `supabase functions deploy generate-tree`
2. Run migrations: `supabase migration up`
3. Add a "Generate" button to your UI
4. Configure user settings page
5. Test with a small problem description
6. Iterate on the system prompts for better results

## Customization

### Modify System Prompts

Edit the prompts in:
- `supabase/functions/generate-tree/index.ts` (edge function)
- `src/components/generator/GenerateModal.tsx` (client-side)

### Styling

All components use Tailwind CSS. Customize by:
- Editing the className strings
- Creating your own theme in `tailwind.config.js`
- Using CSS modules if preferred

### Validation Rules

Modify validation in:
- `src/utils/validateTree.ts`

## Troubleshooting

**"No API key configured"**
- Check that user_settings table has an entry
- Or check localStorage for 'llm_api_key'

**"Invalid YAML"**
- Check the LLM response format
- Adjust the system prompt to be more explicit
- Try a different model or temperature

**"Validation failed"**
- Review the specific errors returned
- Common issues: missing stages, invalid references, orphan nodes

**Edge function timeout**
- Increase max_tokens in the LLM call
- Use a faster model
- Simplify the system prompt

## Support

For issues or questions:
1. Check the component README: `src/components/generator/README.md`
2. Review example usage: `src/components/generator/GeneratorExample.tsx`
3. Check validation logic: `src/utils/validateTree.ts`
