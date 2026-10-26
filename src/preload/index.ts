import { contextBridge, ipcRenderer } from 'electron';
import {
  AppDatabase,
  AppSettings,
  CategoryItem,
  ImportAnalysis,
  ImportOptions,
  ImportSummary,
  PromptItem,
  ReusableBlock,
  ShortcutRegistrationStatus,
  SystemThemeInfo
} from '../shared/types';

export interface ElectronAPI {
  getInitialState: () => Promise<{
    db: AppDatabase;
    systemTheme: SystemThemeInfo;
    shortcutStatus: ShortcutRegistrationStatus;
    loadWarning: string | null;
  }>;
  copyToClipboard: (text: string, promptId?: string) => Promise<{ success: boolean; error?: string }>;
  savePrompt: (
    payload: Partial<PromptItem> & { title: string; body: string }
  ) => Promise<{ prompt: PromptItem; created: boolean }>;
  duplicatePrompt: (promptId: string, suffix?: string) => Promise<PromptItem>;
  softDeletePrompt: (promptId: string) => Promise<PromptItem>;
  restorePrompt: (promptId: string) => Promise<PromptItem>;
  permanentlyDeletePrompt: (promptId: string) => Promise<boolean>;
  emptyTrash: () => Promise<number>;
  toggleFavorite: (promptId: string) => Promise<PromptItem>;
  togglePinned: (promptId: string) => Promise<PromptItem>;
  restorePromptVersion: (promptId: string, versionId: string) => Promise<PromptItem>;
  saveCategory: (payload: { id?: string; name: string; nameEn?: string; color?: string }) => Promise<CategoryItem>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  saveBlock: (payload: Partial<ReusableBlock> & { title: string; content: string }) => Promise<ReusableBlock>;
  duplicateBlock: (blockId: string, suffix?: string) => Promise<ReusableBlock>;
  reorderBlocks: (orderedIds: string[]) => Promise<ReusableBlock[]>;
  deleteBlock: (blockId: string) => Promise<boolean>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<{
    settings: AppSettings;
    shortcutStatus: ShortcutRegistrationStatus;
  }>;
  updateGlobalShortcut: (shortcut: string) => Promise<ShortcutRegistrationStatus>;
  hideLauncher: () => Promise<boolean>;
  openMainFromLauncher: (promptId?: string) => Promise<boolean>;
  exportJson: (options?: {
    promptIds?: string[];
    includeBlocks?: boolean;
    includeSettings?: boolean;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  exportMarkdown: (promptId: string) => Promise<{ canceled: boolean; filePath?: string }>;
  selectImportFile: () => Promise<{
    canceled: boolean;
    filePath?: string;
    rawContent?: string;
    analysis?: ImportAnalysis;
  }>;
  executeImport: (rawContent: string, options: ImportOptions) => Promise<ImportSummary>;
  createManualBackup: () => Promise<{ success: boolean; backupPath: string }>;
  openDataFolder: () => Promise<{ success: boolean }>;
  onDataUpdated: (callback: (db: AppDatabase) => void) => () => void;
  onSystemThemeChanged: (callback: (info: SystemThemeInfo) => void) => () => void;
  onLauncherOpened: (callback: () => void) => () => void;
  onSelectPromptInMain: (callback: (promptId: string) => void) => () => void;
}

const api: ElectronAPI = {
  getInitialState: () => ipcRenderer.invoke('db:get-all'),
  copyToClipboard: (text, promptId) => ipcRenderer.invoke('clipboard:write', { text, promptId }),
  savePrompt: payload => ipcRenderer.invoke('prompts:save', payload),
  duplicatePrompt: (promptId, suffix) => ipcRenderer.invoke('prompts:duplicate', promptId, suffix),
  softDeletePrompt: promptId => ipcRenderer.invoke('prompts:soft-delete', promptId),
  restorePrompt: promptId => ipcRenderer.invoke('prompts:restore', promptId),
  permanentlyDeletePrompt: promptId => ipcRenderer.invoke('prompts:permanent-delete', promptId),
  emptyTrash: () => ipcRenderer.invoke('prompts:empty-trash'),
  toggleFavorite: promptId => ipcRenderer.invoke('prompts:toggle-favorite', promptId),
  togglePinned: promptId => ipcRenderer.invoke('prompts:toggle-pinned', promptId),
  restorePromptVersion: (promptId, versionId) =>
    ipcRenderer.invoke('prompts:restore-version', promptId, versionId),
  saveCategory: payload => ipcRenderer.invoke('categories:save', payload),
  deleteCategory: categoryId => ipcRenderer.invoke('categories:delete', categoryId),
  saveBlock: payload => ipcRenderer.invoke('blocks:save', payload),
  duplicateBlock: (blockId, suffix) => ipcRenderer.invoke('blocks:duplicate', blockId, suffix),
  reorderBlocks: orderedIds => ipcRenderer.invoke('blocks:reorder', orderedIds),
  deleteBlock: blockId => ipcRenderer.invoke('blocks:delete', blockId),
  updateSettings: partial => ipcRenderer.invoke('settings:update', partial),
  updateGlobalShortcut: shortcut => ipcRenderer.invoke('shortcut:update', shortcut),
  hideLauncher: () => ipcRenderer.invoke('launcher:hide'),
  openMainFromLauncher: promptId => ipcRenderer.invoke('launcher:open-main', promptId),
  exportJson: options => ipcRenderer.invoke('data:export-json', options),
  exportMarkdown: promptId => ipcRenderer.invoke('data:export-markdown', promptId),
  selectImportFile: () => ipcRenderer.invoke('data:select-import-file'),
  executeImport: (rawContent, options) => ipcRenderer.invoke('data:execute-import', rawContent, options),
  createManualBackup: () => ipcRenderer.invoke('data:create-backup'),
  openDataFolder: () => ipcRenderer.invoke('data:open-folder'),
  onDataUpdated: callback => {
    const listener = (_event: unknown, db: AppDatabase) => callback(db);
    ipcRenderer.on('app:data-updated', listener);
    return () => ipcRenderer.removeListener('app:data-updated', listener);
  },
  onSystemThemeChanged: callback => {
    const listener = (_event: unknown, info: SystemThemeInfo) => callback(info);
    ipcRenderer.on('system:theme-changed', listener);
    return () => ipcRenderer.removeListener('system:theme-changed', listener);
  },
  onLauncherOpened: callback => {
    const listener = () => callback();
    ipcRenderer.on('launcher:opened', listener);
    return () => ipcRenderer.removeListener('launcher:opened', listener);
  },
  onSelectPromptInMain: callback => {
    const listener = (_event: unknown, promptId: string) => callback(promptId);
    ipcRenderer.on('app:select-prompt', listener);
    return () => ipcRenderer.removeListener('app:select-prompt', listener);
  }
};

contextBridge.exposeInMainWorld('akpromptpad', api);
