import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import {
  AppDatabase,
  AppSettings,
  ImportOptions,
  ReusableBlock,
  ShortcutRegistrationStatus,
  SidebarSection,
  SortBy,
  SortOrder,
  SystemThemeInfo
} from '../shared/types';
import { createInitialDatabase, DEFAULT_GLOBAL_SHORTCUT } from '../shared/constants';
import { filterAndSortPrompts } from '../shared/searchAndFilter';
import { translations } from './i18n/translations';
import { applyThemeToDocument } from './utils/theme';
import { Sidebar } from './components/Sidebar';
import { PromptCard } from './components/PromptCard';
import { PromptInspector } from './components/PromptInspector';
import { PromptComposerView } from './components/PromptComposerView';
import { SettingsView } from './components/SettingsView';
import { ShortcutsModal } from './components/ShortcutsModal';
import { QuickLauncher } from './components/QuickLauncher';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

export const App: React.FC = () => {
  const [db, setDb] = useState<AppDatabase>(() => createInitialDatabase());
  const [systemTheme, setSystemTheme] = useState<SystemThemeInfo>({
    shouldUseDarkColors: false,
    systemAccentColor: '#2563EB'
  });
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutRegistrationStatus>({
    shortcut: DEFAULT_GLOBAL_SHORTCUT,
    registered: true
  });
  const [activeSection, setActiveSection] = useState<SidebarSection>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isLauncherMode = window.location.hash === '#launcher';

  const lang = db.settings.language;
  const t = translations[lang];

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id));
    }, 2800);
  };

  // Load initial database and subscribe to IPC updates
  useEffect(() => {
    window.akpromptpad
      .getInitialState()
      .then(init => {
        setDb(init.db);
        setSystemTheme(init.systemTheme);
        setShortcutStatus(init.shortcutStatus);
        setSortBy(init.db.settings.defaultSortBy);
        setSortOrder(init.db.settings.defaultSortOrder);
        if (init.loadWarning) {
          showToast(init.loadWarning, 'error');
        }
      })
      .catch(() => {
        // Fallback for standalone preview
      });

    const unsubData = window.akpromptpad.onDataUpdated(updatedDb => {
      setDb(updatedDb);
    });
    const unsubTheme = window.akpromptpad.onSystemThemeChanged(info => {
      setSystemTheme(info);
    });
    const unsubSelect = window.akpromptpad.onSelectPromptInMain(promptId => {
      setActiveSection('all');
      setSelectedPromptId(promptId);
      setIsCreatingPrompt(false);
    });

    return () => {
      unsubData();
      unsubTheme();
      unsubSelect();
    };
  }, []);

  // Apply centralized CSS variables and RTL/LTR direction whenever settings or system theme change
  useEffect(() => {
    applyThemeToDocument(db.settings, systemTheme);
  }, [db.settings, systemTheme]);

  // Global application keyboard shortcuts
  useEffect(() => {
    if (isLauncherMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeSection === 'composer' || activeSection === 'blocks' || activeSection === 'settings') {
          setActiveSection('all');
        }
        setIsCreatingPrompt(true);
        setSelectedPromptId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeSection === 'composer' || activeSection === 'blocks' || activeSection === 'settings') {
          setActiveSection('all');
        }
        setTimeout(() => searchInputRef.current?.focus(), 20);
      } else if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (isCreatingPrompt || selectedPromptId) {
          setIsCreatingPrompt(false);
          setSelectedPromptId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLauncherMode, activeSection, isShortcutsOpen, isCreatingPrompt, selectedPromptId]);

  const visiblePrompts = useMemo(() => {
    return filterAndSortPrompts(db.prompts, {
      section: activeSection,
      selectedCategoryId,
      selectedTag,
      searchQuery,
      sortBy,
      sortOrder
    });
  }, [db.prompts, activeSection, selectedCategoryId, selectedTag, searchQuery, sortBy, sortOrder]);

  const selectedPrompt = useMemo(
    () => db.prompts.find(p => p.id === selectedPromptId) || null,
    [db.prompts, selectedPromptId]
  );

  const handleCopyText = async (text: string, promptId?: string) => {
    const res = await window.akpromptpad.copyToClipboard(text, promptId);
    if (res.success) {
      showToast(t.copied, 'success');
    } else {
      showToast(res.error || t.copyError, 'error');
    }
  };

  const handleSavePrompt = async (data: {
    id?: string;
    title: string;
    body: string;
    description: string;
    categoryId: string;
    tags: string[];
  }) => {
    const res = await window.akpromptpad.savePrompt(data);
    setIsCreatingPrompt(false);
    setSelectedPromptId(res.prompt.id);
    showToast(lang === 'fa' ? 'پرامپت با موفقیت ذخیره شد.' : 'Prompt saved.', 'success');
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const res = await window.akpromptpad.updateSettings(partial);
    setShortcutStatus(res.shortcutStatus);
    if (partial.defaultSortBy) setSortBy(partial.defaultSortBy);
    if (partial.defaultSortOrder) setSortOrder(partial.defaultSortOrder);
  };

  // Render Quick Launcher if window hash is #launcher
  if (isLauncherMode) {
    return <QuickLauncher db={db} />;
  }

  const isLibraryView =
    activeSection !== 'composer' && activeSection !== 'blocks' && activeSection !== 'settings';

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        selectedCategoryId={selectedCategoryId}
        onSelectSection={(sec, catId) => {
          setActiveSection(sec);
          setSelectedCategoryId(catId ?? null);
          setSelectedTag(null);
        }}
        prompts={db.prompts}
        categories={db.categories}
        collapsed={db.settings.sidebarCollapsed}
        onToggleCollapse={() =>
          handleUpdateSettings({ sidebarCollapsed: !db.settings.sidebarCollapsed })
        }
        onCreateCategory={async name => {
          await window.akpromptpad.saveCategory({ name });
        }}
        onDeleteCategory={async id => {
          await window.akpromptpad.deleteCategory(id);
          if (selectedCategoryId === id) setSelectedCategoryId(null);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        lang={lang}
        t={t}
      />

      <main className="workspace-main">
        {isLibraryView && (
          <>
            {/* Top Search & Action Bar */}
            <header className="topbar">
              <div className="search-box-wrapper">
                <Search size={16} className="search-box-icon" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="search-input"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  dir="auto"
                />
                <span className="search-kbd" dir="ltr">
                  Ctrl+K
                </span>
              </div>

              <div className="toolbar-actions">
                {activeSection === 'trash' ? (
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (window.confirm(t.confirmEmptyTrash)) {
                        await window.akpromptpad.emptyTrash();
                        setSelectedPromptId(null);
                      }
                    }}
                    disabled={visiblePrompts.length === 0}
                  >
                    <Trash2 size={15} />
                    <span>{t.emptyTrashBtn}</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="btn"
                      onClick={() =>
                        window.akpromptpad.exportJson({
                          promptIds: visiblePrompts.map(p => p.id),
                          includeBlocks: false,
                          includeSettings: false
                        })
                      }
                      disabled={visiblePrompts.length === 0}
                      title="Export Visible Prompts (JSON)"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setIsCreatingPrompt(true);
                        setSelectedPromptId(null);
                      }}
                    >
                      <Plus size={16} />
                      <span>{t.newPrompt}</span>
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* Secondary Sort & Filter Controls */}
            <div className="filter-bar">
              <div className="filter-group">
                {activeSection !== 'categories' && (
                  <select
                    className="select-input"
                    value={selectedCategoryId || 'all'}
                    onChange={e =>
                      setSelectedCategoryId(e.target.value === 'all' ? null : e.target.value)
                    }
                  >
                    <option value="all">{t.filterCategory}</option>
                    {db.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {lang === 'en' && cat.nameEn ? cat.nameEn : cat.name}
                      </option>
                    ))}
                  </select>
                )}

                {selectedTag && (
                  <button className="btn btn-sm" onClick={() => setSelectedTag(null)}>
                    #{selectedTag} ×
                  </button>
                )}
              </div>

              <div className="filter-group">
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  {t.sortBy}
                </span>
                <select
                  className="select-input"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                >
                  <option value="updatedAt">{t.sortUpdated}</option>
                  <option value="createdAt">{t.sortCreated}</option>
                  <option value="alphabetical">{t.sortAlpha}</option>
                  <option value="usageCount">{t.sortUsage}</option>
                </select>

                <select
                  className="select-input"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as SortOrder)}
                >
                  <option value="desc">{t.sortDesc}</option>
                  <option value="asc">{t.sortAsc}</option>
                </select>

                <button
                  className={`icon-btn ${db.settings.viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => handleUpdateSettings({ viewMode: 'grid' })}
                  title={t.viewGrid}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`icon-btn ${db.settings.viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleUpdateSettings({ viewMode: 'list' })}
                  title={t.viewList}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Prompts List + Inspector Split View */}
            <div className="content-split">
              <div className="prompts-scroll-area">
                {visiblePrompts.length === 0 ? (
                  <div className="empty-state">
                    <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                      {t.emptyPromptsTitle}
                    </h3>
                    <p style={{ maxWidth: 420, fontSize: 'var(--font-size-sm)' }}>
                      {t.emptyPromptsDesc}
                    </p>
                    {activeSection !== 'trash' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setIsCreatingPrompt(true);
                          setSelectedPromptId(null);
                        }}
                      >
                        <Plus size={16} />
                        <span>{t.newPrompt}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      db.settings.viewMode === 'grid' ? 'prompts-grid' : 'prompts-list'
                    }
                  >
                    {visiblePrompts.map(prompt => {
                      const cat = db.categories.find(c => c.id === prompt.categoryId);
                      return (
                        <PromptCard
                          key={prompt.id}
                          prompt={prompt}
                          category={cat}
                          selected={prompt.id === selectedPromptId && !isCreatingPrompt}
                          onSelect={() => {
                            setIsCreatingPrompt(false);
                            setSelectedPromptId(prompt.id);
                          }}
                          onCopy={e => {
                            e.stopPropagation();
                            handleCopyText(prompt.body, prompt.id);
                          }}
                          onToggleFavorite={async e => {
                            e.stopPropagation();
                            await window.akpromptpad.toggleFavorite(prompt.id);
                          }}
                          onTogglePinned={async e => {
                            e.stopPropagation();
                            await window.akpromptpad.togglePinned(prompt.id);
                          }}
                          onDuplicate={async e => {
                            e.stopPropagation();
                            const copy = await window.akpromptpad.duplicatePrompt(prompt.id);
                            setSelectedPromptId(copy.id);
                          }}
                          onDeleteOrRestore={async e => {
                            e.stopPropagation();
                            if (prompt.isDeleted) {
                              await window.akpromptpad.restorePrompt(prompt.id);
                            } else {
                              await window.akpromptpad.softDeletePrompt(prompt.id);
                              if (selectedPromptId === prompt.id) setSelectedPromptId(null);
                            }
                          }}
                          onPermanentDelete={async e => {
                            e.stopPropagation();
                            if (window.confirm(t.confirmPermanentDelete)) {
                              await window.akpromptpad.permanentlyDeletePrompt(prompt.id);
                              if (selectedPromptId === prompt.id) setSelectedPromptId(null);
                            }
                          }}
                          lang={lang}
                          t={t}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {(isCreatingPrompt || selectedPrompt) && (
                <PromptInspector
                  prompt={selectedPrompt}
                  isCreating={isCreatingPrompt}
                  allPrompts={db.prompts}
                  categories={db.categories}
                  onClose={() => {
                    setIsCreatingPrompt(false);
                    setSelectedPromptId(null);
                  }}
                  onSave={handleSavePrompt}
                  onCopyText={handleCopyText}
                  onRestoreVersion={async (promptId, versionId) => {
                    await window.akpromptpad.restorePromptVersion(promptId, versionId);
                    showToast(t.versionRestoredMsg, 'success');
                  }}
                  onExportMarkdown={async promptId => {
                    const res = await window.akpromptpad.exportMarkdown(promptId);
                    if (!res.canceled) {
                      showToast('Markdown exported.', 'success');
                    }
                  }}
                  onSelectExistingPrompt={id => {
                    setIsCreatingPrompt(false);
                    setSelectedPromptId(id);
                  }}
                  lang={lang}
                  t={t}
                />
              )}
            </div>
          </>
        )}

        {(activeSection === 'composer' || activeSection === 'blocks') && (
          <PromptComposerView
            blocks={db.blocks}
            categories={db.categories}
            mode={activeSection}
            onSaveBlock={ async (payload: Partial<ReusableBlock> & { title: string; content: string }) => {
              await window.akpromptpad.saveBlock(payload);
            }}
            onDuplicateBlock={async id => {
              await window.akpromptpad.duplicateBlock(id);
            }}
            onDeleteBlock={async id => {
              await window.akpromptpad.deleteBlock(id);
            }}
            onReorderBlocks={async ids => {
              await window.akpromptpad.reorderBlocks(ids);
            }}
            onCopyText={text => handleCopyText(text)}
            onSaveAsPrompt={async payload => {
              const res = await window.akpromptpad.savePrompt(payload);
              setActiveSection('all');
              setSelectedPromptId(res.prompt.id);
              showToast(lang === 'fa' ? 'در کتابخانه ذخیره شد.' : 'Saved to library.', 'success');
            }}
            lang={lang}
            t={t}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsView
            settings={db.settings}
            shortcutStatus={shortcutStatus}
            onUpdateSettings={handleUpdateSettings}
            onUpdateShortcut={async sc => {
              const status = await window.akpromptpad.updateGlobalShortcut(sc);
              setShortcutStatus(status);
              if (status.registered) {
                showToast(t.shortcutActiveBadge, 'success');
              } else {
                showToast(status.error || t.shortcutFailedBadge, 'error');
              }
            }}
            onExportAllJson={async () => {
              const res = await window.akpromptpad.exportJson({
                includeBlocks: true,
                includeSettings: true
              });
              if (!res.canceled) {
                showToast('JSON backup exported.', 'success');
              }
            }}
            onSelectImportFile={() => window.akpromptpad.selectImportFile()}
            onExecuteImport={async (rawContent: string, options: ImportOptions) => {
              const summary = await window.akpromptpad.executeImport(rawContent, options);
              if (summary.success) {
                showToast(
                  lang === 'fa'
                    ? `${summary.importedPrompts} پرامپت درون‌ریزی شد.`
                    : `Imported ${summary.importedPrompts} prompts.`,
                  'success'
                );
              } else {
                showToast(summary.error || 'Import failed', 'error');
              }
            }}
            onCreateManualBackup={async () => {
              await window.akpromptpad.createManualBackup();
              showToast(
                lang === 'fa'
                  ? 'نسخه پشتیبان در پوشه backups ذخیره شد.'
                  : 'Safety backup created in backups folder.',
                'success'
              );
            }}
            onOpenDataFolder={async () => {
              await window.akpromptpad.openDataFolder();
            }}
            lang={lang}
            t={t}
          />
        )}
      </main>

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
        t={t}
        globalShortcut={shortcutStatus.shortcut}
      />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(item => (
          <div
            key={item.id}
            className={`toast ${item.type === 'error' ? 'toast-error' : 'toast-success'}`}
          >
            {item.type === 'error' ? (
              <AlertCircle size={16} style={{ color: 'var(--status-danger)' }} />
            ) : (
              <CheckCircle2 size={16} style={{ color: 'var(--status-success)' }} />
            )}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
