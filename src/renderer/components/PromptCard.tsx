import React from 'react';
import { Copy, Star, Pin, CopyPlus, Trash2, RotateCcw, Braces } from 'lucide-react';
import { CategoryItem, Language, PromptItem } from '../../shared/types';
import { extractVariables } from '../../shared/variables';
import { TranslationDict } from '../i18n/translations';

interface PromptCardProps {
  prompt: PromptItem;
  category?: CategoryItem;
  selected: boolean;
  onSelect: () => void;
  onCopy: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onTogglePinned: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDeleteOrRestore: (e: React.MouseEvent) => void;
  onPermanentDelete?: (e: React.MouseEvent) => void;
  lang: Language;
  t: TranslationDict;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  category,
  selected,
  onSelect,
  onCopy,
  onToggleFavorite,
  onTogglePinned,
  onDuplicate,
  onDeleteOrRestore,
  onPermanentDelete,
  lang,
  t
}) => {
  const vars = extractVariables(prompt.body);
  const categoryLabel = category ? (lang === 'en' && category.nameEn ? category.nameEn : category.name) : '';

  return (
    <div className={`prompt-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="prompt-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <h3 className="prompt-card-title">{prompt.title}</h3>
          {prompt.description && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {prompt.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {!prompt.isDeleted && (
            <>
              <button
                className={`icon-btn ${prompt.isPinned ? 'active' : ''}`}
                style={{ width: 28, height: 28 }}
                onClick={onTogglePinned}
                title={prompt.isPinned ? t.unpin : t.pin}
              >
                <Pin size={14} />
              </button>
              <button
                className={`icon-btn ${prompt.isFavorite ? 'active' : ''}`}
                style={{ width: 28, height: 28 }}
                onClick={onToggleFavorite}
                title={prompt.isFavorite ? t.unfavorite : t.favorite}
              >
                <Star size={14} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={onCopy}
            title={t.copy}
          >
            <Copy size={13} />
            <span>{t.copy}</span>
          </button>
        </div>
      </div>

      <div className="prompt-card-body-preview" dir="auto">
        {prompt.body}
      </div>

      <div className="prompt-card-footer">
        <div className="tag-list">
          {categoryLabel && <span className="category-badge">{categoryLabel}</span>}
          {vars.length > 0 && (
            <span className="variable-badge" title={vars.join(', ')}>
              <Braces size={11} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: 3 }} />
              {vars.length} {t.variablesCountLabel}
            </span>
          )}
          {prompt.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag-pill">
              #{tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {prompt.usageCount} {t.usageCountLabel}
          </span>
          {!prompt.isDeleted ? (
            <>
              <button
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={onDuplicate}
                title={t.duplicate}
              >
                <CopyPlus size={14} />
              </button>
              <button
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={onDeleteOrRestore}
                title={t.delete}
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-sm"
                onClick={onDeleteOrRestore}
                title={t.restore}
              >
                <RotateCcw size={12} />
                <span>{t.restore}</span>
              </button>
              {onPermanentDelete && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={onPermanentDelete}
                  title={t.deletePermanently}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
