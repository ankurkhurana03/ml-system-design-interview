import { useState } from 'react';
import { useModerationConfig } from '@/hooks/useModerationConfig';
import type { ModerationRule } from '@/hooks/useModerationConfig';

export function ModerationSettings() {
  const {
    config,
    loading,
    updateMode,
    toggleRule,
    addRule,
    removeRule,
    updateSettings,
  } = useModerationConfig();

  const [addingRule, setAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleAddRule = async () => {
    if (!newRuleName.trim() || !newRuleDescription.trim()) return;

    const rule: ModerationRule = {
      name: newRuleName.trim(),
      description: newRuleDescription.trim(),
      enabled: true,
    };

    setSaving(true);
    await addRule(rule);
    setSaving(false);
    setNewRuleName('');
    setNewRuleDescription('');
    setAddingRule(false);
  };

  const handleRemoveRule = async (ruleName: string) => {
    if (!confirm(`Are you sure you want to remove the rule "${ruleName}"?`)) return;
    setSaving(true);
    await removeRule(ruleName);
    setSaving(false);
  };

  const handleToggleRule = async (ruleName: string) => {
    setSaving(true);
    await toggleRule(ruleName);
    setSaving(false);
  };

  const handleModeChange = async (mode: 'full_auto' | 'ai_assisted' | 'manual') => {
    setSaving(true);
    await updateMode(mode);
    setSaving(false);
  };

  const handleConfidenceChange = async (value: number) => {
    setSaving(true);
    await updateSettings({ confidence_threshold: value });
    setSaving(false);
  };

  const handleAutoRespondToggle = async () => {
    setSaving(true);
    await updateSettings({ auto_respond_questions: !config.auto_respond_questions });
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Mode Selector */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Moderation Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Full Auto */}
          <button
            onClick={() => handleModeChange('full_auto')}
            disabled={saving}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              config.mode === 'full_auto'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Full Auto</h4>
              {config.mode === 'full_auto' && (
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600">
              AI handles all moderation autonomously. Comments are processed immediately.
            </p>
          </button>

          {/* AI-Assisted */}
          <button
            onClick={() => handleModeChange('ai_assisted')}
            disabled={saving}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              config.mode === 'ai_assisted'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">AI-Assisted</h4>
              {config.mode === 'ai_assisted' && (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600">
              AI pre-screens comments. Uncertain ones are flagged for human review.
            </p>
          </button>

          {/* Manual */}
          <button
            onClick={() => handleModeChange('manual')}
            disabled={saving}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              config.mode === 'manual'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Manual</h4>
              {config.mode === 'manual' && (
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600">
              All comments require manual admin review.
            </p>
          </button>
        </div>
      </div>

      {/* Moderation Rules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Moderation Rules</h3>
          <button
            onClick={() => setAddingRule(true)}
            disabled={saving || addingRule}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Add Rule
          </button>
        </div>

        <div className="space-y-3">
          {config.rules.map((rule) => (
            <div
              key={rule.name}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4"
            >
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.name)}
                  disabled={saving}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
              </div>
              <button
                onClick={() => handleRemoveRule(rule.name)}
                disabled={saving}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="Remove rule"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}

          {/* Add Rule Form */}
          {addingRule && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Add New Rule</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="e.g., Reject duplicate content"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    placeholder="Describe when this rule should apply..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRule}
                    disabled={saving || !newRuleName.trim() || !newRuleDescription.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {saving ? 'Adding...' : 'Add Rule'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingRule(false);
                      setNewRuleName('');
                      setNewRuleDescription('');
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Additional Settings</h3>

        {/* Confidence Threshold (AI-Assisted mode only) */}
        {config.mode === 'ai_assisted' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Confidence Threshold: {config.confidence_threshold.toFixed(2)}
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Comments with AI confidence below this threshold will be flagged for human review.
            </p>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={config.confidence_threshold}
              onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
              disabled={saving}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.5 (More human review)</span>
              <span>1.0 (Less human review)</span>
            </div>
          </div>
        )}

        {/* Auto-respond Questions */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.auto_respond_questions}
              onChange={handleAutoRespondToggle}
              disabled={saving}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900">Auto-respond to Questions</div>
              <div className="text-sm text-gray-600">
                Automatically generate AI answers for approved questions
              </div>
            </div>
          </label>
        </div>
      </div>

      {saving && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}
    </div>
  );
}
