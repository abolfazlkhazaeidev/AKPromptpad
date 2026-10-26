import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Copy, ExternalLink, Check } from 'lucide-react';
import { AppDatabase, PromptItem } from '../../shared/types';
import { filterAndSortPrompts } from '../../shared/searchAndFilter';
import { translations } from '../i18n/translations';

interface QuickLauncherProps {
  db: AppDatabase;
}

export const QuickLauncher: React.FC<QuickLauncherProps> = ({ db }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lang = db.settings.language;
  const t = translations[lang];

  const results = useMemo(() => {
    return filterAndSortPrompts(db.prompts, {
      section: 'all',
      searchQuery: query,
      sortBy: 'usageCount',
      sortOrder: 'desc'
    }).slice(0, 20);
  }, [db.prompts, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    const unsub = window.akpromptpad.onLauncherOpened(() => {
      setQuery('');
      setSelectedIndex(0);
      setCopiedId(null);
      setTimeout(() => inputRef.current?.focus(), 20);
    });
    return unsub;
  }, []);

  const handleCopyPrompt = async (prompt: PromptItem) => {
    const res = await window.akpromptpad.copyToClipboard(prompt.body, prompt.id);
    if (res.success) {
      setCopiedId(prompt.id);
      setTimeout(() => {
        setCopiedId(null);
        window.akpromptpad.hideLauncher();
      }, 450);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      window.akpromptpad.hideLauncher();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        handleCopyPrompt(current);
      }
    }
  };

  return (
    <div className="launcher-shell" onKeyDown={handleKeyDown}>
      <div className="launcher-search-bar">
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          className="launcher-search-input"
          placeholder={t.launcherPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          dir="auto"
          autoFocus
        />
      </div>

      <div className="launcher-results">
        {results.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <span>{t.emptyPromptsTitle}</span>
          </div>
        ) : (
          results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className={`launcher-item ${isSelected ? 'active' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleCopyPrompt(item)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>{item.title}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCopied ? (
                      <span
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--status-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 600
                        }}
                      >
                        <Check size={13} /> {t.copied}
                      </span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={e => {
                          e.stopPropagation();
                          window.akpromptpad.openMainFromLauncher(item.id);
                        }}
                        title={t.launcherOpenMain}
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  dir="auto"
                >
                  {item.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="launcher-footer">
        <span>AKPromptpad Quick Launcher</span>
        <span dir="ltr">↑↓ Navigate • Enter Copy • Esc Close</span>
      </div>
    </div>
  );
};
