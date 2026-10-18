import { PromptItem, SidebarSection, SortBy, SortOrder } from './types';

export interface FilterCriteria {
  section: SidebarSection;
  selectedCategoryId?: string | null;
  selectedTag?: string | null;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onlyFavorites?: boolean;
  onlyPinned?: boolean;
}

/**
 * Filters and sorts prompts deterministically based on active sidebar section, category, tag, search query, and sort rules.
 */
export function filterAndSortPrompts(prompts: PromptItem[], criteria: FilterCriteria): PromptItem[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  const filtered = prompts.filter(prompt => {
    // Trash handling
    if (criteria.section === 'trash') {
      if (!prompt.isDeleted) return false;
    } else {
      if (prompt.isDeleted) return false;
    }

    // Section-level filtering
    if (criteria.section === 'favorites' && !prompt.isFavorite) return false;
    if (criteria.section === 'pinned' && !prompt.isPinned) return false;
    if (criteria.section === 'recent' && (!prompt.lastUsedAt && prompt.usageCount === 0)) return false;
    if (criteria.section === 'categories' && criteria.selectedCategoryId && criteria.selectedCategoryId !== 'all') {
      if (prompt.categoryId !== criteria.selectedCategoryId) return false;
    }

    // Explicit filter toggles
    if (criteria.onlyFavorites && !prompt.isFavorite) return false;
    if (criteria.onlyPinned && !prompt.isPinned) return false;
    if (criteria.selectedCategoryId && criteria.selectedCategoryId !== 'all' && criteria.section !== 'categories') {
      if (prompt.categoryId !== criteria.selectedCategoryId) return false;
    }
    if (criteria.selectedTag) {
      const hasTag = prompt.tags.some(t => t.toLowerCase() === criteria.selectedTag!.toLowerCase());
      if (!hasTag) return false;
    }

    // Global search across title, body, description, and tags
    if (query) {
      const inTitle = prompt.title.toLowerCase().includes(query);
      const inBody = prompt.body.toLowerCase().includes(query);
      const inDesc = (prompt.description || '').toLowerCase().includes(query);
      const inTags = prompt.tags.some(tag => tag.toLowerCase().includes(query));
      if (!inTitle && !inBody && !inDesc && !inTags) {
        return false;
      }
    }

    return true;
  });

  const multiplier = criteria.sortOrder === 'asc' ? 1 : -1;

  return filtered.sort((a, b) => {
    // In 'recent' view, prioritize lastUsedAt descending if sorting by updatedAt
    if (criteria.section === 'recent' && criteria.sortBy === 'updatedAt') {
      const aUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      if (aUsed !== bUsed) return (aUsed - bUsed) * multiplier;
    }

    // Pinned items float to top in 'all' view unless explicitly sorting alphabetically
    if (criteria.section === 'all' && a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    switch (criteria.sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) * multiplier;
      case 'createdAt': {
        const tA = new Date(a.createdAt).getTime() || 0;
        const tB = new Date(b.createdAt).getTime() || 0;
        return (tA - tB) * multiplier;
      }
      case 'usageCount': {
        if (a.usageCount !== b.usageCount) {
          return (a.usageCount - b.usageCount) * multiplier;
        }
        const tA = new Date(a.updatedAt).getTime() || 0;
        const tB = new Date(b.updatedAt).getTime() || 0;
        return (tA - tB) * multiplier;
      }
      case 'updatedAt':
      default: {
        const tA = new Date(a.updatedAt).getTime() || 0;
        const tB = new Date(b.updatedAt).getTime() || 0;
        return (tA - tB) * multiplier;
      }
    }
  });
}
