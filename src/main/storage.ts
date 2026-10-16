import * as fs from 'fs';
import * as path from 'path';
import {
  AppDatabase,
  AppSettings,
  CategoryItem,
  ImportAnalysis,
  ImportOptions,
  ImportSummary,
  PromptItem,
  ReusableBlock
} from '../shared/types';
import { createInitialDatabase, SCHEMA_VERSION } from '../shared/constants';
import {
  analyzeImportPayload,
  formatPromptAsMarkdown,
  isObject,
  sanitizeSettings,
  validateCategoryItem,
  validatePromptItem,
  validateReusableBlock
} from '../shared/validation';
import { recordPromptVersion } from '../shared/history';
import { findExactDuplicate } from '../shared/duplicates';

export class StorageManager {
  private readonly dataDir: string;
  private readonly dbFilePath: string;
  private readonly backupsDir: string;
  private db: AppDatabase;
  private readErrorOccurred = false;
  private lastLoadWarning: string | null = null;

  constructor(userDataPath: string) {
    this.dataDir = userDataPath;
    this.dbFilePath = path.join(this.dataDir, 'akpromptpad-data.json');
    this.backupsDir = path.join(this.dataDir, 'backups');
    this.ensureDirectories();
    this.db = this.loadOrInitialize();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  public getDataDirectory(): string {
    return this.dataDir;
  }

  public getDatabaseFilePath(): string {
    return this.dbFilePath;
  }

  public getLastLoadWarning(): string | null {
    return this.lastLoadWarning;
  }

  // If the JSON file is corrupted (e.g. power loss or manual edit error),
  // copy the broken file into /backups before re-initializing so the user never loses raw text.
  private loadOrInitialize(): AppDatabase {
    if (!fs.existsSync(this.dbFilePath)) {
      const initial = createInitialDatabase();
      this.writeAtomically(this.dbFilePath, JSON.stringify(initial, null, 2));
      return initial;
    }

    try {
      const rawContent = fs.readFileSync(this.dbFilePath, 'utf-8');
      const parsed: unknown = JSON.parse(rawContent);
      if (!isObject(parsed)) {
        throw new Error('Database root is not a valid JSON object.');
      }

      const prompts = Array.isArray(parsed.prompts)
        ? parsed.prompts.map(validatePromptItem).filter((p): p is PromptItem => p !== null)
        : [];
      const categories = Array.isArray(parsed.categories)
        ? parsed.categories.map(validateCategoryItem).filter((c): c is CategoryItem => c !== null)
        : createInitialDatabase().categories;
      const blocks = Array.isArray(parsed.blocks)
        ? parsed.blocks.map(validateReusableBlock).filter((b): b is ReusableBlock => b !== null)
        : createInitialDatabase().blocks;
      const settings = sanitizeSettings(parsed.settings);

      const loadedDb: AppDatabase = {
        schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : SCHEMA_VERSION,
        lastUpdated: typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : new Date().toISOString(),
        prompts,
        categories: categories.length > 0 ? categories : createInitialDatabase().categories,
        blocks,
        settings
      };

      return loadedDb;
    } catch {
      this.readErrorOccurred = true;
      // Preserve the corrupted file so user data is never lost
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const corruptedBackupPath = path.join(this.backupsDir, `corrupted-recovery-${timestamp}.json`);
      try {
        fs.copyFileSync(this.dbFilePath, corruptedBackupPath);
      } catch {
        // Ignore secondary copy error
      }
      this.lastLoadWarning =
        'Existing data file could not be parsed. A recovery copy was saved in the backups folder before loading safe defaults.';
      return createInitialDatabase();
    }
  }

  // Write to a sibling .tmp file first and rename over the target to avoid half-written JSON on crash.
  private writeAtomically(targetPath: string, content: string): void {
    this.ensureDirectories();
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, content, { encoding: 'utf-8', flag: 'w' });
    fs.renameSync(tempPath, targetPath);
  }

  private persist(): void {
    this.db.lastUpdated = new Date().toISOString();
    this.writeAtomically(this.dbFilePath, JSON.stringify(this.db, null, 2));
    this.readErrorOccurred = false;
  }

  public getDatabase(): AppDatabase {
    return JSON.parse(JSON.stringify(this.db));
  }

  public createSafetyBackup(reason = 'manual'): string {
    this.ensureDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeReason = reason.replace(/[^a-zA-Z0-9_-]/g, '');
    const backupFile = path.join(this.backupsDir, `akpromptpad-backup-${safeReason}-${timestamp}.json`);
    this.writeAtomically(backupFile, JSON.stringify(this.db, null, 2));
    return backupFile;
  }

  // --- Prompt Operations ---

  public savePrompt(
    input: Partial<PromptItem> & { title: string; body: string }
  ): { prompt: PromptItem; created: boolean } {
    const now = new Date().toISOString();
    const title = input.title.trim();
    const body = input.body;
    const description = (input.description || '').trim();

    if (!title) {
      throw new Error('Prompt title is required.');
    }

    const existingIdx = input.id ? this.db.prompts.findIndex(p => p.id === input.id) : -1;

    if (existingIdx >= 0) {
      const current = this.db.prompts[existingIdx];
      const updatedVersions = recordPromptVersion(
        current,
        { title, body, description },
        this.db.settings.versionHistoryLimit
      );

      const updated: PromptItem = {
        ...current,
        title,
        body,
        description,
        categoryId: input.categoryId || current.categoryId,
        tags: Array.isArray(input.tags) ? input.tags.map(t => t.trim()).filter(Boolean) : current.tags,
        isFavorite: input.isFavorite !== undefined ? Boolean(input.isFavorite) : current.isFavorite,
        isPinned: input.isPinned !== undefined ? Boolean(input.isPinned) : current.isPinned,
        updatedAt: now,
        versions: updatedVersions
      };

      this.db.prompts[existingIdx] = updated;
      this.persist();
      return { prompt: { ...updated }, created: false };
    } else {
      const newPrompt: PromptItem = {
        id: input.id && input.id.trim() ? input.id.trim() : `prm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        body,
        description,
        categoryId: input.categoryId || (this.db.categories[0]?.id ?? 'cat-productivity'),
        tags: Array.isArray(input.tags) ? input.tags.map(t => t.trim()).filter(Boolean) : [],
        createdAt: now,
        updatedAt: now,
        isFavorite: Boolean(input.isFavorite),
        isPinned: Boolean(input.isPinned),
        isDeleted: false,
        usageCount: 0,
        versions: []
      };

      this.db.prompts.unshift(newPrompt);
      this.persist();
      return { prompt: { ...newPrompt }, created: true };
    }
  }

  public duplicatePrompt(promptId: string, copySuffix = '(Copy)'): PromptItem {
    const source = this.db.prompts.find(p => p.id === promptId);
    if (!source) {
      throw new Error('Prompt not found.');
    }
    const now = new Date().toISOString();
    const copy: PromptItem = {
      ...source,
      id: `prm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${source.title} ${copySuffix}`.trim(),
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      lastUsedAt: undefined,
      versions: []
    };
    this.db.prompts.unshift(copy);
    this.persist();
    return { ...copy };
  }

  public softDeletePrompt(promptId: string): PromptItem {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    prompt.isDeleted = true;
    prompt.deletedAt = new Date().toISOString();
    prompt.updatedAt = prompt.deletedAt;
    this.persist();
    return { ...prompt };
  }

  public restorePrompt(promptId: string): PromptItem {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    prompt.isDeleted = false;
    prompt.deletedAt = undefined;
    prompt.updatedAt = new Date().toISOString();
    this.persist();
    return { ...prompt };
  }

  public permanentlyDeletePrompt(promptId: string): boolean {
    const before = this.db.prompts.length;
    this.db.prompts = this.db.prompts.filter(p => p.id !== promptId);
    if (this.db.prompts.length !== before) {
      this.persist();
      return true;
    }
    return false;
  }

  public emptyTrash(): number {
    const trashCount = this.db.prompts.filter(p => p.isDeleted).length;
    if (trashCount > 0) {
      this.createSafetyBackup('before-empty-trash');
      this.db.prompts = this.db.prompts.filter(p => !p.isDeleted);
      this.persist();
    }
    return trashCount;
  }

  public toggleFavorite(promptId: string): PromptItem {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    prompt.isFavorite = !prompt.isFavorite;
    this.persist();
    return { ...prompt };
  }

  public togglePinned(promptId: string): PromptItem {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    prompt.isPinned = !prompt.isPinned;
    this.persist();
    return { ...prompt };
  }

  public recordPromptUsage(promptId: string): PromptItem | null {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) return null;
    prompt.usageCount = (prompt.usageCount || 0) + 1;
    prompt.lastUsedAt = new Date().toISOString();
    this.persist();
    return { ...prompt };
  }

  public restorePromptVersion(promptId: string, versionId: string): PromptItem {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    const targetVersion = prompt.versions.find(v => v.id === versionId);
    if (!targetVersion) throw new Error('Selected version not found.');

    const updatedVersions = recordPromptVersion(
      prompt,
      {
        title: targetVersion.title,
        body: targetVersion.body,
        description: targetVersion.description
      },
      this.db.settings.versionHistoryLimit
    );

    prompt.title = targetVersion.title;
    prompt.body = targetVersion.body;
    prompt.description = targetVersion.description;
    prompt.updatedAt = new Date().toISOString();
    prompt.versions = updatedVersions;

    this.persist();
    return { ...prompt };
  }

  // --- Category Operations ---

  public saveCategory(input: { id?: string; name: string; nameEn?: string; color?: string }): CategoryItem {
    const name = input.name.trim();
    if (!name) throw new Error('Category name is required.');

    if (input.id) {
      const existing = this.db.categories.find(c => c.id === input.id);
      if (existing) {
        existing.name = name;
        existing.nameEn = input.nameEn?.trim() || existing.nameEn;
        existing.color = input.color || existing.color;
        this.persist();
        return { ...existing };
      }
    }

    const created: CategoryItem = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      nameEn: input.nameEn?.trim(),
      color: input.color,
      createdAt: new Date().toISOString()
    };
    this.db.categories.push(created);
    this.persist();
    return { ...created };
  }

  public deleteCategory(categoryId: string): boolean {
    if (this.db.categories.length <= 1) {
      throw new Error('At least one category must remain.');
    }
    const fallbackId = this.db.categories.find(c => c.id !== categoryId)?.id || 'cat-productivity';
    this.db.prompts.forEach(p => {
      if (p.categoryId === categoryId) {
        p.categoryId = fallbackId;
      }
    });
    this.db.categories = this.db.categories.filter(c => c.id !== categoryId);
    this.persist();
    return true;
  }

  // --- Reusable Block Operations ---

  public saveBlock(
    input: Partial<ReusableBlock> & { title: string; content: string }
  ): ReusableBlock {
    const title = input.title.trim();
    if (!title) throw new Error('Block title is required.');
    const now = new Date().toISOString();

    if (input.id) {
      const idx = this.db.blocks.findIndex(b => b.id === input.id);
      if (idx >= 0) {
        const updated: ReusableBlock = {
          ...this.db.blocks[idx],
          title,
          content: input.content,
          type: input.type || this.db.blocks[idx].type,
          updatedAt: now
        };
        this.db.blocks[idx] = updated;
        this.persist();
        return { ...updated };
      }
    }

    const created: ReusableBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      type: input.type || 'additional_instructions',
      content: input.content,
      createdAt: now,
      updatedAt: now
    };
    this.db.blocks.push(created);
    this.persist();
    return { ...created };
  }

  public duplicateBlock(blockId: string, suffix = '(Copy)'): ReusableBlock {
    const source = this.db.blocks.find(b => b.id === blockId);
    if (!source) throw new Error('Block not found.');
    const now = new Date().toISOString();
    const copy: ReusableBlock = {
      ...source,
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${source.title} ${suffix}`.trim(),
      createdAt: now,
      updatedAt: now
    };
    this.db.blocks.push(copy);
    this.persist();
    return { ...copy };
  }

  public reorderBlocks(orderedIds: string[]): ReusableBlock[] {
    const map = new Map(this.db.blocks.map(b => [b.id, b]));
    const reordered: ReusableBlock[] = [];
    for (const id of orderedIds) {
      const item = map.get(id);
      if (item) {
        reordered.push(item);
        map.delete(id);
      }
    }
    for (const remaining of map.values()) {
      reordered.push(remaining);
    }
    this.db.blocks = reordered;
    this.persist();
    return [...this.db.blocks];
  }

  public deleteBlock(blockId: string): boolean {
    const before = this.db.blocks.length;
    this.db.blocks = this.db.blocks.filter(b => b.id !== blockId);
    if (this.db.blocks.length !== before) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Settings Operations ---

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.db.settings = sanitizeSettings({
      ...this.db.settings,
      ...partial
    });
    this.persist();
    return { ...this.db.settings };
  }

  // --- Export & Import Operations ---

  public buildExportJson(options?: {
    promptIds?: string[];
    includeBlocks?: boolean;
    includeSettings?: boolean;
  }): string {
    const promptsToExport = options?.promptIds
      ? this.db.prompts.filter(p => options.promptIds!.includes(p.id))
      : this.db.prompts;

    const payload: Partial<AppDatabase> = {
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      prompts: promptsToExport,
      categories: this.db.categories
    };

    if (options?.includeBlocks !== false) {
      payload.blocks = this.db.blocks;
    }
    if (options?.includeSettings !== false) {
      payload.settings = this.db.settings;
    }

    return JSON.stringify(payload, null, 2);
  }

  public buildPromptMarkdown(promptId: string): string {
    const prompt = this.db.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found.');
    const category = this.db.categories.find(c => c.id === prompt.categoryId);
    return formatPromptAsMarkdown(prompt, category?.name);
  }

  public analyzeImport(rawJsonContent: string): ImportAnalysis {
    return analyzeImportPayload(rawJsonContent, this.db.prompts);
  }

  public executeImport(rawJsonContent: string, options: ImportOptions): ImportSummary {
    const analysis = analyzeImportPayload(rawJsonContent, this.db.prompts);
    if (!analysis.valid || !analysis.rawPayload) {
      return {
        success: false,
        importedPrompts: 0,
        skippedPrompts: 0,
        overwrittenPrompts: 0,
        importedBlocks: 0,
        error: analysis.errors.join(' ') || 'Invalid import file.'
      };
    }

    // Create automatic safety backup before modifying database
    const backupPath = this.createSafetyBackup('before-import');

    let importedPrompts = 0;
    let skippedPrompts = 0;
    let overwrittenPrompts = 0;
    let importedBlocks = 0;

    // Merge categories
    if (Array.isArray(analysis.rawPayload.categories)) {
      for (const incomingCat of analysis.rawPayload.categories) {
        const exists = this.db.categories.some(
          c => c.id === incomingCat.id || c.name.toLowerCase() === incomingCat.name.toLowerCase()
        );
        if (!exists) {
          this.db.categories.push(incomingCat);
        }
      }
    }

    // Merge prompts according to conflictStrategy
    if (Array.isArray(analysis.rawPayload.prompts)) {
      for (const incoming of analysis.rawPayload.prompts) {
        const existingByIdIdx = this.db.prompts.findIndex(p => p.id === incoming.id && !p.isDeleted);
        const dupResult = findExactDuplicate(incoming, this.db.prompts);
        const isConflict = existingByIdIdx >= 0 || dupResult.isDuplicate;

        if (!isConflict) {
          this.db.prompts.unshift(incoming);
          importedPrompts++;
        } else if (options.conflictStrategy === 'skip') {
          skippedPrompts++;
        } else if (options.conflictStrategy === 'overwrite') {
          const targetIdx =
            existingByIdIdx >= 0
              ? existingByIdIdx
              : this.db.prompts.findIndex(p => p.id === dupResult.existingPrompt?.id);
          if (targetIdx >= 0) {
            this.db.prompts[targetIdx] = {
              ...incoming,
              id: this.db.prompts[targetIdx].id,
              updatedAt: new Date().toISOString()
            };
            overwrittenPrompts++;
          } else {
            this.db.prompts.unshift(incoming);
            importedPrompts++;
          }
        } else if (options.conflictStrategy === 'copy') {
          const copyItem: PromptItem = {
            ...incoming,
            id: `prm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: `${incoming.title} (Imported)`,
            updatedAt: new Date().toISOString()
          };
          this.db.prompts.unshift(copyItem);
          importedPrompts++;
        }
      }
    }

    // Merge reusable blocks if requested
    if (options.includeBlocks && Array.isArray(analysis.rawPayload.blocks)) {
      for (const incomingBlock of analysis.rawPayload.blocks) {
        const exists = this.db.blocks.some(
          b => b.id === incomingBlock.id || (b.title === incomingBlock.title && b.content === incomingBlock.content)
        );
        if (!exists) {
          this.db.blocks.push(incomingBlock);
          importedBlocks++;
        }
      }
    }

    // Merge settings if requested
    if (options.includeSettings && analysis.rawPayload.settings) {
      this.db.settings = sanitizeSettings({
        ...this.db.settings,
        ...analysis.rawPayload.settings
      });
    }

    this.persist();

    return {
      success: true,
      importedPrompts,
      skippedPrompts,
      overwrittenPrompts,
      importedBlocks,
      backupPath
    };
  }
}
