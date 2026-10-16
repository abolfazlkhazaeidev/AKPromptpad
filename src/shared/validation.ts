import {
  AppDatabase,
  AppSettings,
  CategoryItem,
  ComposerBlockType,
  ImportAnalysis,
  PromptItem,
  ReusableBlock
} from './types';
import { COMPOSER_BLOCK_TYPES, DEFAULT_SETTINGS, SCHEMA_VERSION } from './constants';
import { findExactDuplicate } from './duplicates';

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function validatePromptItem(raw: unknown): PromptItem | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim()) return null;
  if (typeof raw.body !== 'string') return null;

  const now = new Date().toISOString();
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map(t => t.trim())
    : [];

  const versions = Array.isArray(raw.versions)
    ? raw.versions
        .filter(isObject)
        .filter(v => typeof v.id === 'string' && typeof v.title === 'string' && typeof v.body === 'string')
        .map(v => ({
          id: String(v.id),
          title: String(v.title),
          body: String(v.body),
          description: typeof v.description === 'string' ? v.description : '',
          timestamp: typeof v.timestamp === 'string' ? v.timestamp : now
        }))
    : [];

  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    body: raw.body,
    description: typeof raw.description === 'string' ? raw.description : '',
    categoryId: typeof raw.categoryId === 'string' && raw.categoryId.trim() ? raw.categoryId.trim() : 'cat-productivity',
    tags,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    isFavorite: Boolean(raw.isFavorite),
    isPinned: Boolean(raw.isPinned),
    isDeleted: Boolean(raw.isDeleted),
    deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : undefined,
    usageCount: typeof raw.usageCount === 'number' && Number.isFinite(raw.usageCount) && raw.usageCount >= 0 ? Math.floor(raw.usageCount) : 0,
    lastUsedAt: typeof raw.lastUsedAt === 'string' ? raw.lastUsedAt : undefined,
    versions
  };
}

export function validateCategoryItem(raw: unknown): CategoryItem | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;

  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    nameEn: typeof raw.nameEn === 'string' ? raw.nameEn.trim() : undefined,
    color: typeof raw.color === 'string' ? raw.color : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
  };
}

export function validateReusableBlock(raw: unknown): ReusableBlock | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim()) return null;
  if (typeof raw.content !== 'string') return null;

  const blockType: ComposerBlockType =
    typeof raw.type === 'string' && COMPOSER_BLOCK_TYPES.includes(raw.type as ComposerBlockType)
      ? (raw.type as ComposerBlockType)
      : 'additional_instructions';

  const now = new Date().toISOString();
  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    type: blockType,
    content: raw.content,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now
  };
}

export function sanitizeSettings(raw: unknown): AppSettings {
  if (!isObject(raw)) return { ...DEFAULT_SETTINGS };

  // Never allow a purple default hex if someone corrupted customAccentColor
  const customHex =
    typeof raw.customAccentColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.customAccentColor)
      ? raw.customAccentColor
      : DEFAULT_SETTINGS.customAccentColor;

  return {
    language: raw.language === 'en' || raw.language === 'fa' ? raw.language : DEFAULT_SETTINGS.language,
    theme: raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? raw.theme : DEFAULT_SETTINGS.theme,
    accentType:
      raw.accentType === 'neutral' || raw.accentType === 'system' || raw.accentType === 'custom'
        ? raw.accentType
        : DEFAULT_SETTINGS.accentType,
    customAccentColor: customHex,
    density: raw.density === 'compact' || raw.density === 'comfortable' ? raw.density : DEFAULT_SETTINGS.density,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    defaultSortBy:
      raw.defaultSortBy === 'updatedAt' ||
      raw.defaultSortBy === 'createdAt' ||
      raw.defaultSortBy === 'alphabetical' ||
      raw.defaultSortBy === 'usageCount'
        ? raw.defaultSortBy
        : DEFAULT_SETTINGS.defaultSortBy,
    defaultSortOrder: raw.defaultSortOrder === 'asc' || raw.defaultSortOrder === 'desc' ? raw.defaultSortOrder : DEFAULT_SETTINGS.defaultSortOrder,
    viewMode: raw.viewMode === 'list' || raw.viewMode === 'grid' ? raw.viewMode : DEFAULT_SETTINGS.viewMode,
    globalShortcut:
      typeof raw.globalShortcut === 'string' && raw.globalShortcut.trim().length > 0
        ? raw.globalShortcut.trim()
        : DEFAULT_SETTINGS.globalShortcut,
    versionHistoryLimit:
      typeof raw.versionHistoryLimit === 'number' && raw.versionHistoryLimit >= 1 && raw.versionHistoryLimit <= 50
        ? Math.floor(raw.versionHistoryLimit)
        : DEFAULT_SETTINGS.versionHistoryLimit,
    sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : DEFAULT_SETTINGS.sidebarCollapsed
  };
}

/**
 * Validates an imported JSON string or parsed object against the AKPromptpad schema,
 * checks for conflicts/duplicates against existing prompts, and returns a structured analysis.
 */
export function analyzeImportPayload(rawInput: unknown, existingPrompts: PromptItem[]): ImportAnalysis {
  let parsed: unknown = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      return {
        valid: false,
        errors: ['Invalid JSON syntax. File could not be parsed.'],
        totalPrompts: 0,
        duplicatePromptsCount: 0,
        duplicateIds: [],
        blocksCount: 0,
        categoriesCount: 0,
        hasSettings: false
      };
    }
  }

  if (!isObject(parsed)) {
    return {
      valid: false,
      errors: ['Root JSON value must be an object.'],
      totalPrompts: 0,
      duplicatePromptsCount: 0,
      duplicateIds: [],
      blocksCount: 0,
      categoriesCount: 0,
      hasSettings: false
    };
  }

  const errors: string[] = [];
  const validPrompts: PromptItem[] = [];
  const validCategories: CategoryItem[] = [];
  const validBlocks: ReusableBlock[] = [];

  if (!Array.isArray(parsed.prompts)) {
    errors.push('Missing or invalid "prompts" array.');
  } else {
    parsed.prompts.forEach((p, idx) => {
      const validated = validatePromptItem(p);
      if (!validated) {
        errors.push(`Prompt at index ${idx} is missing required fields (id, title, or body).`);
      } else {
        validPrompts.push(validated);
      }
    });
  }

  if (parsed.categories !== undefined) {
    if (!Array.isArray(parsed.categories)) {
      errors.push('"categories" field must be an array when provided.');
    } else {
      parsed.categories.forEach((c, idx) => {
        const validated = validateCategoryItem(c);
        if (!validated) {
          errors.push(`Category at index ${idx} is invalid.`);
        } else {
          validCategories.push(validated);
        }
      });
    }
  }

  if (parsed.blocks !== undefined) {
    if (!Array.isArray(parsed.blocks)) {
      errors.push('"blocks" field must be an array when provided.');
    } else {
      parsed.blocks.forEach((b, idx) => {
        const validated = validateReusableBlock(b);
        if (!validated) {
          errors.push(`Reusable block at index ${idx} is invalid.`);
        } else {
          validBlocks.push(validated);
        }
      });
    }
  }

  if (errors.length > 0 && validPrompts.length === 0 && validBlocks.length === 0) {
    return {
      valid: false,
      errors,
      totalPrompts: 0,
      duplicatePromptsCount: 0,
      duplicateIds: [],
      blocksCount: 0,
      categoriesCount: 0,
      hasSettings: false
    };
  }

  const duplicateIds: string[] = [];
  for (const candidate of validPrompts) {
    const idExists = existingPrompts.some(ep => ep.id === candidate.id && !ep.isDeleted);
    const contentDup = findExactDuplicate(candidate, existingPrompts);
    if (idExists || contentDup.isDuplicate) {
      duplicateIds.push(candidate.id);
    }
  }

  const hasSettings = isObject(parsed.settings);

  return {
    valid: true,
    errors,
    totalPrompts: validPrompts.length,
    duplicatePromptsCount: duplicateIds.length,
    duplicateIds,
    blocksCount: validBlocks.length,
    categoriesCount: validCategories.length,
    hasSettings,
    rawPayload: {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : SCHEMA_VERSION,
      prompts: validPrompts,
      categories: validCategories,
      blocks: validBlocks,
      settings: hasSettings ? sanitizeSettings(parsed.settings) : undefined
    }
  };
}

/**
 * Formats a single PromptItem into clean, portable Markdown for individual export.
 */
export function formatPromptAsMarkdown(prompt: PromptItem, categoryName?: string): string {
  const lines: string[] = [];
  lines.push(`# ${prompt.title}`);
  lines.push('');
  if (prompt.description && prompt.description.trim()) {
    lines.push(`> ${prompt.description.trim()}`);
    lines.push('');
  }
  lines.push('## Metadata');
  if (categoryName) {
    lines.push(`- **Category**: ${categoryName}`);
  }
  if (prompt.tags.length > 0) {
    lines.push(`- **Tags**: ${prompt.tags.join(', ')}`);
  }
  lines.push(`- **Created**: ${prompt.createdAt}`);
  lines.push(`- **Updated**: ${prompt.updatedAt}`);
  lines.push(`- **Usage Count**: ${prompt.usageCount}`);
  lines.push('');
  lines.push('## Prompt Template');
  lines.push('');
  lines.push('```text');
  lines.push(prompt.body);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}
