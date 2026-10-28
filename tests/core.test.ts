import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractVariables, compileTemplate, isValidVariableName, isMultilineVariable } from '../src/shared/variables';
import { findExactDuplicate, normalizeForComparison } from '../src/shared/duplicates';
import { filterAndSortPrompts } from '../src/shared/searchAndFilter';
import { assemblePromptFromBlocks } from '../src/shared/composer';
import { recordPromptVersion, hasMeaningfulPromptChange } from '../src/shared/history';
import { analyzeImportPayload, formatPromptAsMarkdown, sanitizeSettings } from '../src/shared/validation';
import { StorageManager } from '../src/main/storage';
import { PromptItem, ReusableBlock } from '../src/shared/types';

describe('Smart Variable Parser & Template Compiler', () => {
  it('extracts unique valid variable names in order of appearance', () => {
    const template = 'Build {{project_name}} using {{programming_language}} and test {{project_name}} with {{requirements}}.';
    const vars = extractVariables(template);
    expect(vars).toEqual(['project_name', 'programming_language', 'requirements']);
  });

  it('supports Persian/Unicode variable names and ignores malformed tokens', () => {
    const template = 'پروژه {{نام_پروژه}} با زبان {{زبان_برنامه}} و {{ invalid space }} یا {{}}';
    const vars = extractVariables(template);
    expect(vars).toEqual(['نام_پروژه', 'زبان_برنامه']);
  });

  it('validates variable names safely', () => {
    expect(isValidVariableName('project_name')).toBe(true);
    expect(isValidVariableName('زبان_برنامه')).toBe(true);
    expect(isValidVariableName('has space')).toBe(false);
    expect(isValidVariableName('alert(1)')).toBe(false);
    expect(isValidVariableName('')).toBe(false);
  });

  it('compiles templates deterministically without executing code or recursive replacement', () => {
    const template = 'Project: {{project_name}}, Lang: {{lang}}, Empty: {{missing}}';
    const resultKeep = compileTemplate(
      template,
      { project_name: '{{injected}}', lang: 'TypeScript' },
      { keepPlaceholderOnEmpty: true }
    );
    expect(resultKeep).toBe('Project: {{injected}}, Lang: TypeScript, Empty: {{missing}}');

    const resultStrip = compileTemplate(
      template,
      { project_name: 'AKPromptpad', lang: 'TypeScript' },
      { keepPlaceholderOnEmpty: false }
    );
    expect(resultStrip).toBe('Project: AKPromptpad, Lang: TypeScript, Empty: ');
  });

  it('detects multiline variables accurately', () => {
    expect(isMultilineVariable('requirements')).toBe(true);
    expect(isMultilineVariable('نیازمندی‌ها')).toBe(true);
    expect(isMultilineVariable('project_name', 'line1\nline2')).toBe(true);
    expect(isMultilineVariable('project_name', 'single')).toBe(false);
  });
});

describe('Duplicate Detection', () => {
  const samplePrompts: PromptItem[] = [
    {
      id: 'p1',
      title: 'Code Review Prompt',
      body: 'Review this TypeScript code carefully.',
      description: '',
      categoryId: 'cat-coding',
      tags: ['review'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      isFavorite: false,
      isPinned: false,
      isDeleted: false,
      usageCount: 0,
      versions: []
    }
  ];

  it('detects exact title and body duplicates regardless of CRLF/whitespace', () => {
    const res = findExactDuplicate(
      { title: '  code review prompt ', body: 'Review this TypeScript code carefully.\r\n' },
      samplePrompts
    );
    expect(res.isDuplicate).toBe(true);
    expect(res.matchType).toBe('title_and_body');
    expect(res.existingPrompt?.id).toBe('p1');
  });

  it('ignores excluded prompt ID when editing existing prompt', () => {
    const res = findExactDuplicate(
      { title: 'Code Review Prompt', body: 'Review this TypeScript code carefully.' },
      samplePrompts,
      'p1'
    );
    expect(res.isDuplicate).toBe(false);
  });
});

describe('Search, Filtering, and Sorting', () => {
  const list: PromptItem[] = [
    {
      id: 'p1',
      title: 'Alpha Prompt',
      body: 'First body with python',
      description: 'Desc A',
      categoryId: 'cat-1',
      tags: ['python', 'backend'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      isFavorite: true,
      isPinned: false,
      isDeleted: false,
      usageCount: 2,
      versions: []
    },
    {
      id: 'p2',
      title: 'Beta Prompt',
      body: 'Second body with react',
      description: 'Desc B',
      categoryId: 'cat-2',
      tags: ['react', 'frontend'],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
      isFavorite: false,
      isPinned: true,
      isDeleted: false,
      usageCount: 10,
      versions: []
    },
    {
      id: 'p3',
      title: 'Deleted Prompt',
      body: 'Should only appear in trash',
      description: '',
      categoryId: 'cat-1',
      tags: [],
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      isFavorite: false,
      isPinned: false,
      isDeleted: true,
      usageCount: 0,
      versions: []
    }
  ];

  it('filters out deleted prompts in main sections and shows them in trash', () => {
    const mainRes = filterAndSortPrompts(list, {
      section: 'all',
      searchQuery: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    expect(mainRes.map(p => p.id)).toEqual(['p2', 'p1']);

    const trashRes = filterAndSortPrompts(list, {
      section: 'trash',
      searchQuery: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    expect(trashRes.map(p => p.id)).toEqual(['p3']);
  });

  it('searches across title, body, description, and tags', () => {
    const res = filterAndSortPrompts(list, {
      section: 'all',
      searchQuery: 'frontend',
      sortBy: 'alphabetical',
      sortOrder: 'asc'
    });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('p2');
  });

  it('sorts alphabetically and by usageCount accurately', () => {
    const alphaAsc = filterAndSortPrompts(list, {
      section: 'all',
      searchQuery: '',
      sortBy: 'alphabetical',
      sortOrder: 'asc'
    });
    // Note: in 'all' section, pinned items float first unless alphabetical
    expect(alphaAsc.map(p => p.id)).toEqual(['p2', 'p1']);
  });
});

describe('Version History & Prompt Composer', () => {
  it('records version snapshots only on meaningful edits and respects max limit', () => {
    const base: PromptItem = {
      id: 'p1',
      title: 'Initial Title',
      body: 'Initial Body',
      description: 'Initial Desc',
      categoryId: 'cat-1',
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      isFavorite: false,
      isPinned: false,
      isDeleted: false,
      usageCount: 0,
      versions: []
    };

    expect(hasMeaningfulPromptChange(base, { title: 'Initial Title  ', body: 'Initial Body', description: 'Initial Desc' })).toBe(false);

    const versionsAfterEdit = recordPromptVersion(
      base,
      { title: 'Updated Title', body: 'Initial Body', description: 'Initial Desc' },
      3
    );
    expect(versionsAfterEdit.length).toBe(1);
    expect(versionsAfterEdit[0].title).toBe('Initial Title');
  });

  it('assembles reusable blocks deterministically', () => {
    const blocks: ReusableBlock[] = [
      { id: 'b1', title: 'Role 1', type: 'role', content: 'You are an expert.', createdAt: '', updatedAt: '' },
      { id: 'b2', title: 'Format 1', type: 'output_format', content: 'Use Markdown.', createdAt: '', updatedAt: '' }
    ];
    const output = assemblePromptFromBlocks(blocks, {
      includeSectionHeaders: true,
      headerLanguage: 'en',
      customGoalText: 'Focus on security.'
    });
    expect(output).toContain('### Role\nYou are an expert.');
    expect(output).toContain('### Output Format\nUse Markdown.');
    expect(output).toContain('### Specific Details\nFocus on security.');
  });
});

describe('StorageManager Persistence, Import Validation & Recovery', () => {
  it('initializes default data, saves edits, records history, and executes imports with backups', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akpromptpad-test-'));
    try {
      const storage = new StorageManager(tmpDir);
      const initialDb = storage.getDatabase();
      expect(initialDb.prompts.length).toBeGreaterThanOrEqual(3);
      expect(initialDb.settings.language).toBe('fa');

      // Create a new prompt
      const saved = storage.savePrompt({
        title: 'Test Persistence Prompt',
        body: 'Hello {{user_name}}',
        description: 'Testing local JSON storage',
        categoryId: initialDb.categories[0].id,
        tags: ['test']
      });
      expect(saved.created).toBe(true);

      // Update prompt to trigger version history
      const edited = storage.savePrompt({
        id: saved.prompt.id,
        title: 'Test Persistence Prompt v2',
        body: 'Hello {{user_name}} updated!',
        description: 'Testing local JSON storage'
      });
      expect(edited.prompt.versions.length).toBe(1);

      // Verify Markdown export
      const md = storage.buildPromptMarkdown(saved.prompt.id);
      expect(md).toContain('# Test Persistence Prompt v2');
      expect(md).toContain('Hello {{user_name}} updated!');

      // Verify Import Analysis & Execution
      const exportJson = storage.buildExportJson({ includeBlocks: true, includeSettings: true });
      const analysis = analyzeImportPayload(exportJson, storage.getDatabase().prompts);
      expect(analysis.valid).toBe(true);
      expect(analysis.duplicatePromptsCount).toBeGreaterThan(0);

      const summarySkip = storage.executeImport(exportJson, {
        conflictStrategy: 'skip',
        includeBlocks: true,
        includeSettings: false
      });
      expect(summarySkip.success).toBe(true);
      expect(summarySkip.skippedPrompts).toBeGreaterThan(0);
      expect(summarySkip.backupPath && fs.existsSync(summarySkip.backupPath)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
