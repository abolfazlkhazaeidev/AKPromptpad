import React, { useState, useMemo } from 'react';
import {
  Plus,
  Copy,
  Save,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  CopyPlus,
  Check
} from 'lucide-react';
import {
  CategoryItem,
  ComposerBlockType,
  Language,
  ReusableBlock
} from '../../shared/types';
import { COMPOSER_BLOCK_TYPES } from '../../shared/constants';
import { assemblePromptFromBlocks, BLOCK_TYPE_LABELS } from '../../shared/composer';
import { TranslationDict } from '../i18n/translations';

interface PromptComposerViewProps {
  blocks: ReusableBlock[];
  categories: CategoryItem[];
  mode: 'composer' | 'blocks';
  onSaveBlock: (payload: Partial<ReusableBlock> & { title: string; content: string }) => Promise<void>;
  onDuplicateBlock: (blockId: string) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
  onReorderBlocks: (orderedIds: string[]) => Promise<void>;
  onCopyText: (text: string) => Promise<void>;
  onSaveAsPrompt: (payload: {
    title: string;
    body: string;
    description: string;
    categoryId: string;
    tags: string[];
  }) => Promise<void>;
  lang: Language;
  t: TranslationDict;
}

export const PromptComposerView: React.FC<PromptComposerViewProps> = ({
  blocks,
  categories,
  mode,
  onSaveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onCopyText,
  onSaveAsPrompt,
  lang,
  t
}) => {
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>(() =>
    blocks.slice(0, 2).map(b => b.id)
  );
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [customGoalText, setCustomGoalText] = useState('');
  const [savePromptTitle, setSavePromptTitle] = useState('');
  const [saveCategoryId, setSaveCategoryId] = useState(categories[0]?.id || 'cat-productivity');

  // Block Editor Modal state
  const [editingBlock, setEditingBlock] = useState<ReusableBlock | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockType, setBlockType] = useState<ComposerBlockType>('role');
  const [blockContent, setBlockContent] = useState('');

  const openCreateBlockModal = () => {
    setEditingBlock(null);
    setBlockTitle('');
    setBlockType('role');
    setBlockContent('');
    setIsBlockModalOpen(true);
  };

  const openEditBlockModal = (blk: ReusableBlock) => {
    setEditingBlock(blk);
    setBlockTitle(blk.title);
    setBlockType(blk.type);
    setBlockContent(blk.content);
    setIsBlockModalOpen(true);
  };

  const handleSaveBlockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim() || !blockContent.trim()) return;
    await onSaveBlock({
      id: editingBlock?.id,
      title: blockTitle.trim(),
      type: blockType,
      content: blockContent
    });
    setIsBlockModalOpen(false);
  };

  const toggleBlockInComposition = (blockId: string) => {
    setSelectedBlockIds(prev =>
      prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
    );
  };

  const moveSelectedBlock = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedBlockIds.length) return;
    const next = [...selectedBlockIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setSelectedBlockIds(next);
  };

  const moveLibraryBlock = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const ids = blocks.map(b => b.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIdx, 0, moved);
    await onReorderBlocks(ids);
  };

  const activeBlocks = useMemo(() => {
    const map = new Map(blocks.map(b => [b.id, b]));
    return selectedBlockIds.map(id => map.get(id)).filter((b): b is ReusableBlock => Boolean(b));
  }, [blocks, selectedBlockIds]);

  const assembledPrompt = useMemo(() => {
    return assemblePromptFromBlocks(activeBlocks, {
      includeSectionHeaders: includeHeaders,
      headerLanguage: lang,
      customGoalText
    });
  }, [activeBlocks, includeHeaders, lang, customGoalText]);

  const handleSaveComposedToLibrary = async () => {
    if (!assembledPrompt.trim()) return;
    const defaultTitle =
      savePromptTitle.trim() ||
      (lang === 'fa'
        ? `پرامپت ترکیب‌شده (${new Date().toLocaleDateString('fa-IR')})`
        : `Composed Prompt (${new Date().toLocaleDateString()})`);

    await onSaveAsPrompt({
      title: defaultTitle,
      body: assembledPrompt,
      description: lang === 'fa' ? 'ساخته‌شده در بخش ترکیب‌کننده پرامپت' : 'Created via Prompt Composer',
      categoryId: saveCategoryId,
      tags: ['composed']
    });
    setSavePromptTitle('');
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            {mode === 'blocks' ? t.reusableBlocks : t.composerTitle}
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {t.composerSubtitle}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateBlockModal}>
          <Plus size={16} />
          <span>{t.newBlockBtn}</span>
        </button>
      </div>

      <div className="composer-grid">
        {/* Left Column: Reusable Blocks Catalog */}
        <div className="settings-card">
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            {t.availableBlocks} ({blocks.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {blocks.map((blk, idx) => {
              const isSelected = selectedBlockIds.includes(blk.id);
              const typeLabel = BLOCK_TYPE_LABELS[blk.type]?.[lang] || blk.type;
              return (
                <div
                  key={blk.id}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', flex: 1 }}
                      onClick={() => toggleBlockInComposition(blk.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="category-badge">{typeLabel}</span>
                        <strong style={{ fontSize: 'var(--font-size-sm)' }}>{blk.title}</strong>
                      </div>
                      <p
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap'
                        }}
                        dir="auto"
                      >
                        {blk.content}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                        onClick={() => toggleBlockInComposition(blk.id)}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => moveLibraryBlock(idx, -1)}
                        disabled={idx === 0}
                        title={t.moveUp}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => moveLibraryBlock(idx, 1)}
                        disabled={idx === blocks.length - 1}
                        title={t.moveDown}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => openEditBlockModal(blk)}
                        title={t.edit}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => onDuplicateBlock(blk.id)}
                        title={t.duplicate}
                      >
                        <CopyPlus size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => onDeleteBlock(blk.id)}
                        title={t.delete}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Assembly & Preview */}
        <div className="settings-card">
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            {t.selectedBlocksForAssembly} ({activeBlocks.length})
          </h2>

          {activeBlocks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeBlocks.map((blk, idx) => (
                <div
                  key={blk.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                    {idx + 1}. {blk.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="icon-btn"
                      style={{ width: 24, height: 24 }}
                      onClick={() => moveSelectedBlock(idx, -1)}
                      disabled={idx === 0}
                      title={t.moveUp}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 24, height: 24 }}
                      onClick={() => moveSelectedBlock(idx, 1)}
                      disabled={idx === activeBlocks.length - 1}
                      title={t.moveDown}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 24, height: 24 }}
                      onClick={() => toggleBlockInComposition(blk.id)}
                      title={t.delete}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeHeaders}
              onChange={e => setIncludeHeaders(e.target.checked)}
            />
            <span>{t.includeSectionHeaders}</span>
          </label>

          <div className="form-field">
            <label className="form-label">{t.customAdditionalText}</label>
            <textarea
              className="textarea-input"
              rows={3}
              value={customGoalText}
              onChange={e => setCustomGoalText(e.target.value)}
              dir="auto"
            />
          </div>

          <div className="form-field">
            <label className="form-label">{t.assembledPreview}</label>
            <div className="preview-box" style={{ minHeight: 160 }} dir="auto">
              {assembledPrompt}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => onCopyText(assembledPrompt)}
              disabled={!assembledPrompt.trim()}
            >
              <Copy size={15} />
              <span>{t.copyAssembled}</span>
            </button>
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              className="text-input"
              style={{ flex: 1, minWidth: 160 }}
              placeholder={t.promptTitlePlaceholder}
              value={savePromptTitle}
              onChange={e => setSavePromptTitle(e.target.value)}
              dir="auto"
            />
            <select
              className="select-input"
              value={saveCategoryId}
              onChange={e => setSaveCategoryId(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'en' && c.nameEn ? c.nameEn : c.name}
                </option>
              ))}
            </select>
            <button
              className="btn"
              onClick={handleSaveComposedToLibrary}
              disabled={!assembledPrompt.trim()}
            >
              <Save size={15} />
              <span>{t.saveToLibrary}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Block Modal */}
      {isBlockModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBlockModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{editingBlock ? t.edit : t.newBlockBtn}</strong>
            </div>
            <form onSubmit={handleSaveBlockModal}>
              <div className="modal-body">
                <div className="form-field">
                  <label className="form-label">{t.blockTitleLabel}</label>
                  <input
                    type="text"
                    className="text-input"
                    value={blockTitle}
                    onChange={e => setBlockTitle(e.target.value)}
                    required
                    dir="auto"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t.blockTypeLabel}</label>
                  <select
                    className="select-input"
                    value={blockType}
                    onChange={e => setBlockType(e.target.value as ComposerBlockType)}
                  >
                    {COMPOSER_BLOCK_TYPES.map(bt => (
                      <option key={bt} value={bt}>
                        {BLOCK_TYPE_LABELS[bt][lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">{t.blockContentLabel}</label>
                  <textarea
                    className="textarea-input"
                    rows={5}
                    value={blockContent}
                    onChange={e => setBlockContent(e.target.value)}
                    required
                    dir="auto"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setIsBlockModalOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
