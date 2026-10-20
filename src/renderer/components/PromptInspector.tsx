import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Copy,
  History,
  FileDown,
  Braces,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { CategoryItem, DuplicateCheckResult, Language, PromptItem } from '../../shared/types';
import { compileTemplate, extractVariables, isMultilineVariable } from '../../shared/variables';
import { findExactDuplicate } from '../../shared/duplicates';
import { TranslationDict } from '../i18n/translations';

interface PromptInspectorProps {
  prompt: PromptItem | null;
  isCreating: boolean;
  allPrompts: PromptItem[];
  categories: CategoryItem[];
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    body: string;
    description: string;
    categoryId: string;
    tags: string[];
  }) => Promise<void>;
  onCopyText: (text: string, promptId?: string) => Promise<void>;
  onRestoreVersion: (promptId: string, versionId: string) => Promise<void>;
  onExportMarkdown: (promptId: string) => Promise<void>;
  onSelectExistingPrompt: (promptId: string) => void;
  lang: Language;
  t: TranslationDict;
}

export const PromptInspector: React.FC<PromptInspectorProps> = ({
  prompt,
  isCreating,
  allPrompts,
  categories,
  onClose,
  onSave,
  onCopyText,
  onRestoreVersion,
  onExportMarkdown,
  onSelectExistingPrompt,
  lang,
  t
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-productivity');
  const [tagsInput, setTagsInput] = useState('');
  const [body, setBody] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [keepEmptyPlaceholders, setKeepEmptyPlaceholders] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);

  useEffect(() => {
    if (prompt && !isCreating) {
      setTitle(prompt.title);
      setDescription(prompt.description || '');
      setCategoryId(prompt.categoryId || categories[0]?.id || 'cat-productivity');
      setTagsInput(prompt.tags.join(', '));
      setBody(prompt.body);
      setVariableValues({});
      setDuplicateWarning(null);
    } else if (isCreating) {
      setTitle('');
      setDescription('');
      setCategoryId(categories[0]?.id || 'cat-productivity');
      setTagsInput('');
      setBody('');
      setVariableValues({});
      setDuplicateWarning(null);
      setShowHistory(false);
    }
  }, [prompt, isCreating, categories]);

  const detectedVariables = useMemo(() => extractVariables(body), [body]);

  const compiledOutput = useMemo(() => {
    if (detectedVariables.length === 0) return body;
    return compileTemplate(body, variableValues, {
      keepPlaceholderOnEmpty: keepEmptyPlaceholders
    });
  }, [body, detectedVariables, variableValues, keepEmptyPlaceholders]);

  const triggerSave = async (forceIgnoreDuplicate = false) => {
    if (!title.trim() || !body.trim()) return;

    if (!forceIgnoreDuplicate) {
      const dup = findExactDuplicate(
        { title, body },
        allPrompts,
        isCreating ? undefined : prompt?.id
      );
      if (dup.isDuplicate) {
        setDuplicateWarning(dup);
        return;
      }
    }

    setDuplicateWarning(null);
    const parsedTags = tagsInput
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);

    await onSave({
      id: isCreating ? undefined : prompt?.id,
      title: title.trim(),
      body,
      description: description.trim(),
      categoryId,
      tags: parsedTags
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSave(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onCopyText(compiledOutput, prompt?.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!prompt && !isCreating) return null;

  return (
    <aside className="inspector-panel">
      <div className="inspector-header">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
          {isCreating ? t.createPromptTitle : t.editPromptTitle}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isCreating && prompt && (
            <>
              <button
                className={`icon-btn ${showHistory ? 'active' : ''}`}
                onClick={() => setShowHistory(!showHistory)}
                title={t.versionHistoryTitle}
              >
                <History size={16} />
              </button>
              <button
                className="icon-btn"
                onClick={() => onExportMarkdown(prompt.id)}
                title={t.exportMarkdown}
              >
                <FileDown size={16} />
              </button>
            </>
          )}
          <button className="icon-btn" onClick={onClose} title={t.close}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="inspector-body">
        {/* Duplicate Detection Banner */}
        {duplicateWarning && duplicateWarning.isDuplicate && duplicateWarning.existingPrompt && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--status-warning-bg)',
              border: '1px solid var(--status-warning)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>{t.duplicateWarningTitle}</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)' }}>
              {t.duplicateWarningDesc} <strong>{duplicateWarning.existingPrompt.title}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                onClick={() => onSelectExistingPrompt(duplicateWarning.existingPrompt!.id)}
              >
                {t.openExistingPrompt}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => triggerSave(true)}>
                {t.saveAnyway}
              </button>
            </div>
          </div>
        )}

        {/* Version History Drawer */}
        {showHistory && !isCreating && prompt && (
          <div className="variable-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                {t.versionHistoryTitle} ({prompt.versions.length})
              </strong>
              <button className="btn btn-sm" onClick={() => setShowHistory(false)}>
                {t.close}
              </button>
            </div>
            {prompt.versions.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                {t.noVersionsYet}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 200, overflowY: 'auto' }}>
                {prompt.versions.map(ver => (
                  <div
                    key={ver.id}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} dir="ltr">
                        {new Date(ver.timestamp).toLocaleString()}
                      </span>
                      <button
                        className="btn btn-sm"
                        onClick={() => onRestoreVersion(prompt.id, ver.id)}
                      >
                        <RotateCcw size={12} />
                        <span>{t.restoreVersionBtn}</span>
                      </button>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{ver.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Editor Form Fields */}
        <div className="form-field">
          <label className="form-label">{t.promptTitleLabel}</label>
          <input
            type="text"
            className="text-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t.promptTitlePlaceholder}
            dir="auto"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-field">
            <label className="form-label">{t.promptCategoryLabel}</label>
            <select
              className="select-input"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'en' && cat.nameEn ? cat.nameEn : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">{t.promptTagsLabel}</label>
            <input
              type="text"
              className="text-input"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder={t.promptTagsPlaceholder}
              dir="auto"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">{t.promptDescLabel}</label>
          <input
            type="text"
            className="text-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t.promptDescPlaceholder}
            dir="auto"
          />
        </div>

        <div className="form-field">
          <label className="form-label">{t.promptBodyLabel}</label>
          <textarea
            className="textarea-input"
            rows={7}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t.promptBodyPlaceholder}
            dir="auto"
          />
        </div>

        {/* Smart Prompt Builder — Dynamic Variable Inputs */}
        {detectedVariables.length > 0 && (
          <div className="variable-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Braces size={16} />
              <span>{t.smartBuilderTitle}</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
              {t.smartBuilderSubtitle}
            </p>

            {detectedVariables.map(varName => {
              const val = variableValues[varName] || '';
              const multiline = isMultilineVariable(varName, val);
              return (
                <div key={varName} className="form-field">
                  <label className="form-label" style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">
                    {`{{${varName}}}`}
                  </label>
                  {multiline ? (
                    <textarea
                      className="textarea-input"
                      rows={3}
                      value={val}
                      onChange={e =>
                        setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))
                      }
                      dir="auto"
                    />
                  ) : (
                    <input
                      type="text"
                      className="text-input"
                      value={val}
                      onChange={e =>
                        setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))
                      }
                      dir="auto"
                    />
                  )}
                </div>
              );
            })}

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={keepEmptyPlaceholders}
                onChange={e => setKeepEmptyPlaceholders(e.target.checked)}
              />
              <span>{t.keepEmptyPlaceholders}</span>
            </label>

            <div className="form-field">
              <label className="form-label">{t.compiledPreviewLabel}</label>
              <div className="preview-box" dir="auto">
                {compiledOutput}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => onCopyText(compiledOutput, prompt?.id)}
            >
              <Copy size={15} />
              <span>{t.copyCompiledPrompt}</span>
            </button>
          </div>
        )}
      </div>

      <div className="inspector-footer">
        <button
          className="btn"
          onClick={() => onCopyText(compiledOutput, prompt?.id)}
          disabled={!body.trim()}
        >
          <Copy size={15} />
          <span>{t.copy}</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => triggerSave(false)}
            disabled={!title.trim() || !body.trim()}
          >
            <Save size={15} />
            <span>{t.saveChanges}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
