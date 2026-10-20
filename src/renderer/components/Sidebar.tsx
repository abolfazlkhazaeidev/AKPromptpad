import React, { useState } from 'react';
import {
  FileText,
  Star,
  Pin,
  Clock,
  Folder,
  Layers,
  Blocks,
  Trash2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Keyboard,
  X
} from 'lucide-react';
import { CategoryItem, Language, PromptItem, SidebarSection } from '../../shared/types';
import { TranslationDict } from '../i18n/translations';

interface SidebarProps {
  activeSection: SidebarSection;
  selectedCategoryId: string | null;
  onSelectSection: (section: SidebarSection, categoryId?: string | null) => void;
  prompts: PromptItem[];
  categories: CategoryItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onOpenShortcuts: () => void;
  lang: Language;
  t: TranslationDict;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  selectedCategoryId,
  onSelectSection,
  prompts,
  categories,
  collapsed,
  onToggleCollapse,
  onCreateCategory,
  onDeleteCategory,
  onOpenShortcuts,
  lang,
  t
}) => {
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const activePrompts = prompts.filter(p => !p.isDeleted);
  const favoritesCount = activePrompts.filter(p => p.isFavorite).length;
  const pinnedCount = activePrompts.filter(p => p.isPinned).length;
  const recentCount = activePrompts.filter(p => p.usageCount > 0 || p.lastUsedAt).length;
  const trashCount = prompts.filter(p => p.isDeleted).length;

  const handleAddCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onCreateCategory(newCatName.trim());
      setNewCatName('');
      setAddingCategory(false);
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="brand-group">
            <span className="brand-badge">AK</span>
            <span>{t.appName}</span>
          </div>
        )}
        <button
          className="icon-btn"
          onClick={onToggleCollapse}
          title={collapsed ? t.expandSidebar : t.collapseSidebar}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-title">{t.navLibrary}</div>}

        <button
          className={`nav-item ${activeSection === 'all' ? 'active' : ''}`}
          onClick={() => onSelectSection('all', null)}
          title={t.allPrompts}
        >
          <span className="nav-item-main">
            <FileText size={17} />
            {!collapsed && <span>{t.allPrompts}</span>}
          </span>
          {!collapsed && <span className="nav-badge">{activePrompts.length}</span>}
        </button>

        <button
          className={`nav-item ${activeSection === 'favorites' ? 'active' : ''}`}
          onClick={() => onSelectSection('favorites', null)}
          title={t.favorites}
        >
          <span className="nav-item-main">
            <Star size={17} />
            {!collapsed && <span>{t.favorites}</span>}
          </span>
          {!collapsed && <span className="nav-badge">{favoritesCount}</span>}
        </button>

        <button
          className={`nav-item ${activeSection === 'pinned' ? 'active' : ''}`}
          onClick={() => onSelectSection('pinned', null)}
          title={t.pinned}
        >
          <span className="nav-item-main">
            <Pin size={17} />
            {!collapsed && <span>{t.pinned}</span>}
          </span>
          {!collapsed && <span className="nav-badge">{pinnedCount}</span>}
        </button>

        <button
          className={`nav-item ${activeSection === 'recent' ? 'active' : ''}`}
          onClick={() => onSelectSection('recent', null)}
          title={t.recentlyUsed}
        >
          <span className="nav-item-main">
            <Clock size={17} />
            {!collapsed && <span>{t.recentlyUsed}</span>}
          </span>
          {!collapsed && <span className="nav-badge">{recentCount}</span>}
        </button>

        {/* Categories Section */}
        {!collapsed && (
          <div
            className="nav-section-title"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>{t.categories}</span>
            <button
              className="icon-btn"
              style={{ width: 22, height: 22 }}
              onClick={() => setAddingCategory(!addingCategory)}
              title={t.addCategoryBtn}
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {!collapsed && addingCategory && (
          <form onSubmit={handleAddCatSubmit} style={{ padding: '4px 8px', display: 'flex', gap: '4px' }}>
            <input
              type="text"
              className="text-input"
              style={{ height: 28, fontSize: '12px', flex: 1, minWidth: 0 }}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder={t.addCategoryBtn}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 28 }}>
              +
            </button>
          </form>
        )}

        {categories.map(cat => {
          const count = activePrompts.filter(p => p.categoryId === cat.id).length;
          const displayName = lang === 'en' && cat.nameEn ? cat.nameEn : cat.name;
          const isSelected = activeSection === 'categories' && selectedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              className={`nav-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectSection('categories', cat.id)}
              title={displayName}
            >
              <span className="nav-item-main">
                <Folder size={16} />
                {!collapsed && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                )}
              </span>
              {!collapsed && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="nav-badge">{count}</span>
                  {categories.length > 1 && (
                    <button
                      className="icon-btn"
                      style={{ width: 20, height: 20, opacity: 0.6 }}
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteCategory(cat.id);
                      }}
                      title={t.delete}
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}

        {!collapsed && <div className="nav-section-title">{t.navTools}</div>}

        <button
          className={`nav-item ${activeSection === 'composer' ? 'active' : ''}`}
          onClick={() => onSelectSection('composer', null)}
          title={t.promptComposer}
        >
          <span className="nav-item-main">
            <Layers size={17} />
            {!collapsed && <span>{t.promptComposer}</span>}
          </span>
        </button>

        <button
          className={`nav-item ${activeSection === 'blocks' ? 'active' : ''}`}
          onClick={() => onSelectSection('blocks', null)}
          title={t.reusableBlocks}
        >
          <span className="nav-item-main">
            <Blocks size={17} />
            {!collapsed && <span>{t.reusableBlocks}</span>}
          </span>
        </button>

        <button
          className={`nav-item ${activeSection === 'trash' ? 'active' : ''}`}
          onClick={() => onSelectSection('trash', null)}
          title={t.trash}
        >
          <span className="nav-item-main">
            <Trash2 size={17} />
            {!collapsed && <span>{t.trash}</span>}
          </span>
          {!collapsed && trashCount > 0 && <span className="nav-badge">{trashCount}</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={onOpenShortcuts} title={t.keyboardShortcuts}>
          <span className="nav-item-main">
            <Keyboard size={17} />
            {!collapsed && <span>{t.keyboardShortcuts}</span>}
          </span>
        </button>
        <button
          className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectSection('settings', null)}
          title={t.settings}
        >
          <span className="nav-item-main">
            <Settings size={17} />
            {!collapsed && <span>{t.settings}</span>}
          </span>
        </button>
      </div>
    </aside>
  );
};
