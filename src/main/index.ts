import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  nativeTheme,
  shell,
  systemPreferences
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { StorageManager } from './storage';
import {
  AppSettings,
  ImportOptions,
  PromptItem,
  ReusableBlock,
  ShortcutRegistrationStatus,
  SystemThemeInfo
} from '../shared/types';
import { DEFAULT_GLOBAL_SHORTCUT } from '../shared/constants';
import { isObject } from '../shared/validation';

let storage: StorageManager;
let mainWindow: BrowserWindow | null = null;
let launcherWindow: BrowserWindow | null = null;
let isQuitting = false;
let currentShortcutStatus: ShortcutRegistrationStatus = {
  shortcut: DEFAULT_GLOBAL_SHORTCUT,
  registered: false
};

function getSystemThemeInfo(): SystemThemeInfo {
  let accent = '#2563EB';
  try {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      const rawColor = systemPreferences.getAccentColor(); // returns RRGGBBAA hex on Windows
      if (rawColor && rawColor.length >= 6) {
        accent = `#${rawColor.slice(0, 6)}`;
      }
    }
  } catch {
    // Fallback to neutral blue if unavailable
  }
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    systemAccentColor: accent
  };
}

function getPreloadPath(): string {
  return path.join(__dirname, '../preload/index.js');
}

function loadRendererUrl(win: BrowserWindow, hashRoute = ''): void {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devServerUrl) {
    const url = hashRoute ? `${devServerUrl}#${hashRoute}` : devServerUrl;
    win.loadURL(url);
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    if (hashRoute) {
      win.loadFile(indexHtml, { hash: hashRoute });
    } else {
      win.loadFile(indexHtml);
    }
  }
}

function applySecurityGuards(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
    if (devServerUrl && navigationUrl.startsWith(devServerUrl)) {
      return;
    }
    if (navigationUrl.startsWith('file://')) {
      return;
    }
    event.preventDefault();
  });
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'AKPromptpad',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#121316' : '#F8F9FA',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false
    }
  });

  applySecurityGuards(mainWindow);
  loadRendererUrl(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createLauncherWindow(): void {
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    return;
  }

  launcherWindow = new BrowserWindow({
    width: 680,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'AKPromptpad Quick Launcher',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181B' : '#FFFFFF',
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false
    }
  });

  applySecurityGuards(launcherWindow);
  loadRendererUrl(launcherWindow, 'launcher');

  launcherWindow.on('blur', () => {
    if (launcherWindow && !launcherWindow.isDestroyed() && launcherWindow.isVisible()) {
      launcherWindow.hide();
    }
  });

  launcherWindow.on('close', event => {
    if (!isQuitting && launcherWindow && !launcherWindow.isDestroyed()) {
      event.preventDefault();
      launcherWindow.hide();
    }
  });
}

function toggleQuickLauncher(): void {
  if (!launcherWindow || launcherWindow.isDestroyed()) {
    createLauncherWindow();
  }
  if (!launcherWindow) return;

  if (launcherWindow.isVisible() && launcherWindow.isFocused()) {
    launcherWindow.hide();
  } else {
    launcherWindow.center();
    launcherWindow.show();
    launcherWindow.focus();
    launcherWindow.webContents.send('launcher:opened');
  }
}

function broadcastDataChanged(): void {
  const dbSnapshot = storage.getDatabase();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:data-updated', dbSnapshot);
  }
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send('app:data-updated', dbSnapshot);
  }
}

function registerAppGlobalShortcut(accelerator: string): ShortcutRegistrationStatus {
  const sanitized = (accelerator || DEFAULT_GLOBAL_SHORTCUT).trim();
  try {
    globalShortcut.unregisterAll();
    const ok = globalShortcut.register(sanitized, () => {
      toggleQuickLauncher();
    });

    if (!ok) {
      currentShortcutStatus = {
        shortcut: sanitized,
        registered: false,
        error: `Shortcut "${sanitized}" is currently in use by another application or unavailable.`
      };
    } else {
      currentShortcutStatus = {
        shortcut: sanitized,
        registered: true
      };
    }
  } catch (err) {
    currentShortcutStatus = {
      shortcut: sanitized,
      registered: false,
      error: err instanceof Error ? err.message : 'Failed to register global shortcut.'
    };
  }
  return currentShortcutStatus;
}

function setupIpcHandlers(): void {
  // Initial State & Metadata
  ipcMain.handle('db:get-all', () => {
    return {
      db: storage.getDatabase(),
      systemTheme: getSystemThemeInfo(),
      shortcutStatus: currentShortcutStatus,
      loadWarning: storage.getLastLoadWarning()
    };
  });

  // Clipboard (explicit user action only, never monitors or reads clipboard)
  ipcMain.handle('clipboard:write', (_event, payload: unknown) => {
    if (!isObject(payload) || typeof payload.text !== 'string') {
      return { success: false, error: 'Invalid clipboard text payload.' };
    }
    try {
      clipboard.writeText(payload.text);
      if (typeof payload.promptId === 'string' && payload.promptId.trim()) {
        storage.recordPromptUsage(payload.promptId.trim());
        broadcastDataChanged();
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Clipboard write operation failed.'
      };
    }
  });

  // Prompts CRUD
  ipcMain.handle('prompts:save', (_event, payload: unknown) => {
    if (!isObject(payload) || typeof payload.title !== 'string' || typeof payload.body !== 'string') {
      throw new Error('Invalid prompt payload.');
    }
    const result = storage.savePrompt(payload as unknown as Partial<PromptItem> & { title: string; body: string });
    broadcastDataChanged();
    return result;
  });

  ipcMain.handle('prompts:duplicate', (_event, promptId: unknown, suffix: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const copy = storage.duplicatePrompt(promptId, typeof suffix === 'string' ? suffix : '(Copy)');
    broadcastDataChanged();
    return copy;
  });

  ipcMain.handle('prompts:soft-delete', (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const updated = storage.softDeletePrompt(promptId);
    broadcastDataChanged();
    return updated;
  });

  ipcMain.handle('prompts:restore', (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const updated = storage.restorePrompt(promptId);
    broadcastDataChanged();
    return updated;
  });

  ipcMain.handle('prompts:permanent-delete', (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const deleted = storage.permanentlyDeletePrompt(promptId);
    broadcastDataChanged();
    return deleted;
  });

  ipcMain.handle('prompts:empty-trash', () => {
    const count = storage.emptyTrash();
    broadcastDataChanged();
    return count;
  });

  ipcMain.handle('prompts:toggle-favorite', (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const updated = storage.toggleFavorite(promptId);
    broadcastDataChanged();
    return updated;
  });

  ipcMain.handle('prompts:toggle-pinned', (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const updated = storage.togglePinned(promptId);
    broadcastDataChanged();
    return updated;
  });

  ipcMain.handle('prompts:restore-version', (_event, promptId: unknown, versionId: unknown) => {
    if (typeof promptId !== 'string' || typeof versionId !== 'string') {
      throw new Error('Invalid prompt or version ID.');
    }
    const updated = storage.restorePromptVersion(promptId, versionId);
    broadcastDataChanged();
    return updated;
  });

  // Categories CRUD
  ipcMain.handle('categories:save', (_event, payload: unknown) => {
    if (!isObject(payload) || typeof payload.name !== 'string') {
      throw new Error('Invalid category payload.');
    }
    const cat = storage.saveCategory({
      id: typeof payload.id === 'string' ? payload.id : undefined,
      name: payload.name,
      nameEn: typeof payload.nameEn === 'string' ? payload.nameEn : undefined,
      color: typeof payload.color === 'string' ? payload.color : undefined
    });
    broadcastDataChanged();
    return cat;
  });

  ipcMain.handle('categories:delete', (_event, categoryId: unknown) => {
    if (typeof categoryId !== 'string') throw new Error('Invalid category ID.');
    const res = storage.deleteCategory(categoryId);
    broadcastDataChanged();
    return res;
  });

  // Reusable Blocks CRUD
  ipcMain.handle('blocks:save', (_event, payload: unknown) => {
    if (!isObject(payload) || typeof payload.title !== 'string' || typeof payload.content !== 'string') {
      throw new Error('Invalid block payload.');
    }
    const blk = storage.saveBlock(payload as unknown as Partial<ReusableBlock> & { title: string; content: string });
    broadcastDataChanged();
    return blk;
  });

  ipcMain.handle('blocks:duplicate', (_event, blockId: unknown, suffix: unknown) => {
    if (typeof blockId !== 'string') throw new Error('Invalid block ID.');
    const blk = storage.duplicateBlock(blockId, typeof suffix === 'string' ? suffix : '(Copy)');
    broadcastDataChanged();
    return blk;
  });

  ipcMain.handle('blocks:reorder', (_event, orderedIds: unknown) => {
    if (!Array.isArray(orderedIds) || !orderedIds.every(id => typeof id === 'string')) {
      throw new Error('Invalid block ID list.');
    }
    const list = storage.reorderBlocks(orderedIds);
    broadcastDataChanged();
    return list;
  });

  ipcMain.handle('blocks:delete', (_event, blockId: unknown) => {
    if (typeof blockId !== 'string') throw new Error('Invalid block ID.');
    const res = storage.deleteBlock(blockId);
    broadcastDataChanged();
    return res;
  });

  // Settings & Global Shortcut
  ipcMain.handle('settings:update', (_event, partial: unknown) => {
    if (!isObject(partial)) throw new Error('Invalid settings payload.');
    const prevShortcut = storage.getDatabase().settings.globalShortcut;
    const updatedSettings = storage.updateSettings(partial as Partial<AppSettings>);

    if (
      typeof partial.globalShortcut === 'string' &&
      partial.globalShortcut.trim() !== prevShortcut
    ) {
      registerAppGlobalShortcut(updatedSettings.globalShortcut);
    }

    broadcastDataChanged();
    return {
      settings: updatedSettings,
      shortcutStatus: currentShortcutStatus
    };
  });

  ipcMain.handle('shortcut:update', (_event, newShortcut: unknown) => {
    if (typeof newShortcut !== 'string' || !newShortcut.trim()) {
      return {
        shortcut: currentShortcutStatus.shortcut,
        registered: false,
        error: 'Shortcut cannot be empty.'
      };
    }
    const status = registerAppGlobalShortcut(newShortcut.trim());
    if (status.registered) {
      storage.updateSettings({ globalShortcut: status.shortcut });
      broadcastDataChanged();
    }
    return status;
  });

  // Launcher Window Controls
  ipcMain.handle('launcher:hide', () => {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.hide();
    }
    return true;
  });

  ipcMain.handle('launcher:open-main', (_event, promptId?: unknown) => {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.hide();
    }
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    if (typeof promptId === 'string' && mainWindow) {
      mainWindow.webContents.send('app:select-prompt', promptId);
    }
    return true;
  });

  // Data Export, Import, and Backups
  ipcMain.handle('data:export-json', async (_event, options: unknown) => {
    const opts = isObject(options) ? options : {};
    const jsonString = storage.buildExportJson({
      promptIds: Array.isArray(opts.promptIds) ? (opts.promptIds as string[]) : undefined,
      includeBlocks: typeof opts.includeBlocks === 'boolean' ? opts.includeBlocks : true,
      includeSettings: typeof opts.includeSettings === 'boolean' ? opts.includeSettings : true
    });

    const dateTag = new Date().toISOString().slice(0, 10);
    const saveResult = await dialog.showSaveDialog(mainWindow || undefined!, {
      title: 'Export AKPromptpad Data (JSON)',
      defaultPath: `AKPromptpad-Backup-${dateTag}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(saveResult.filePath, jsonString, 'utf-8');
    return { canceled: false, filePath: saveResult.filePath };
  });

  ipcMain.handle('data:export-markdown', async (_event, promptId: unknown) => {
    if (typeof promptId !== 'string') throw new Error('Invalid prompt ID.');
    const mdContent = storage.buildPromptMarkdown(promptId);
    const prompt = storage.getDatabase().prompts.find(p => p.id === promptId);
    const safeTitle = (prompt?.title || 'prompt')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .slice(0, 60)
      .trim();

    const saveResult = await dialog.showSaveDialog(mainWindow || undefined!, {
      title: 'Export Prompt as Markdown',
      defaultPath: `${safeTitle || 'prompt'}.md`,
      filters: [{ name: 'Markdown Files', extensions: ['md'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(saveResult.filePath, mdContent, 'utf-8');
    return { canceled: false, filePath: saveResult.filePath };
  });

  ipcMain.handle('data:select-import-file', async () => {
    const openResult = await dialog.showOpenDialog(mainWindow || undefined!, {
      title: 'Select AKPromptpad JSON Backup to Import',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (openResult.canceled || openResult.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedPath = openResult.filePaths[0];
    const rawContent = fs.readFileSync(selectedPath, 'utf-8');
    const analysis = storage.analyzeImport(rawContent);
    return {
      canceled: false,
      filePath: selectedPath,
      rawContent,
      analysis
    };
  });

  ipcMain.handle('data:execute-import', (_event, rawContent: unknown, options: unknown) => {
    if (typeof rawContent !== 'string' || !isObject(options)) {
      throw new Error('Invalid import request parameters.');
    }
    const importOpts: ImportOptions = {
      conflictStrategy:
        options.conflictStrategy === 'overwrite' || options.conflictStrategy === 'copy'
          ? options.conflictStrategy
          : 'skip',
      includeBlocks: Boolean(options.includeBlocks),
      includeSettings: Boolean(options.includeSettings)
    };
    const summary = storage.executeImport(rawContent, importOpts);
    broadcastDataChanged();
    return summary;
  });

  ipcMain.handle('data:create-backup', () => {
    const backupPath = storage.createSafetyBackup('user-manual');
    return { success: true, backupPath };
  });

  ipcMain.handle('data:open-folder', async () => {
    const folder = storage.getDataDirectory();
    await shell.openPath(folder);
    return { success: true };
  });
}

// App Lifecycle
app.whenReady().then(() => {
  storage = new StorageManager(app.getPath('userData'));
  setupIpcHandlers();
  createMainWindow();
  createLauncherWindow();

  const initialShortcut = storage.getDatabase().settings.globalShortcut || DEFAULT_GLOBAL_SHORTCUT;
  registerAppGlobalShortcut(initialShortcut);

  nativeTheme.on('updated', () => {
    const info = getSystemThemeInfo();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system:theme-changed', info);
    }
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.webContents.send('system:theme-changed', info);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
