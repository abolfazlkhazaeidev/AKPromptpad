export type Language = 'fa' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentType = 'neutral' | 'system' | 'custom';
export type DensityMode = 'comfortable' | 'compact';
export type SortBy = 'updatedAt' | 'createdAt' | 'alphabetical' | 'usageCount';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export type SidebarSection =
  | 'all'
  | 'favorites'
  | 'pinned'
  | 'recent'
  | 'categories'
  | 'composer'
  | 'blocks'
  | 'trash'
  | 'settings';

export type ComposerBlockType =
  | 'role'
  | 'objective'
  | 'context'
  | 'requirements'
  | 'constraints'
  | 'output_format'
  | 'quality_criteria'
  | 'additional_instructions';

export interface PromptVersion {
  id: string;
  title: string;
  body: string;
  description: string;
  timestamp: string;
}

export interface PromptItem {
  id: string;
  title: string;
  body: string;
  description: string;
  categoryId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  usageCount: number;
  lastUsedAt?: string;
  versions: PromptVersion[];
}

export interface CategoryItem {
  id: string;
  name: string;
  nameEn?: string;
  color?: string;
  createdAt: string;
}

export interface ReusableBlock {
  id: string;
  title: string;
  type: ComposerBlockType;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  accentType: AccentType;
  customAccentColor: string;
  density: DensityMode;
  reducedMotion: boolean;
  defaultSortBy: SortBy;
  defaultSortOrder: SortOrder;
  viewMode: ViewMode;
  globalShortcut: string;
  versionHistoryLimit: number;
  sidebarCollapsed: boolean;
}

export interface AppDatabase {
  schemaVersion: number;
  lastUpdated: string;
  prompts: PromptItem[];
  categories: CategoryItem[];
  blocks: ReusableBlock[];
  settings: AppSettings;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingPrompt?: PromptItem;
  matchType?: 'title_and_body' | 'exact_body' | 'exact_title';
}

export type ImportConflictStrategy = 'skip' | 'copy' | 'overwrite';

export interface ImportOptions {
  conflictStrategy: ImportConflictStrategy;
  includeBlocks: boolean;
  includeSettings: boolean;
}

export interface ImportAnalysis {
  valid: boolean;
  errors: string[];
  totalPrompts: number;
  duplicatePromptsCount: number;
  duplicateIds: string[];
  blocksCount: number;
  categoriesCount: number;
  hasSettings: boolean;
  rawPayload?: Partial<AppDatabase>;
}

export interface ImportSummary {
  success: boolean;
  importedPrompts: number;
  skippedPrompts: number;
  overwrittenPrompts: number;
  importedBlocks: number;
  backupPath?: string;
  error?: string;
}

export interface SystemThemeInfo {
  shouldUseDarkColors: boolean;
  systemAccentColor: string;
}

export interface ShortcutRegistrationStatus {
  shortcut: string;
  registered: boolean;
  error?: string;
}
