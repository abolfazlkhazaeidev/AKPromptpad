import { AppDatabase, AppSettings, CategoryItem, ComposerBlockType, PromptItem, ReusableBlock } from './types';

export const APP_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+Space';

export const COMPOSER_BLOCK_TYPES: ComposerBlockType[] = [
  'role',
  'objective',
  'context',
  'requirements',
  'constraints',
  'output_format',
  'quality_criteria',
  'additional_instructions'
];

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'fa',
  theme: 'system',
  accentType: 'neutral',
  customAccentColor: '#2563EB', // Safe neutral blue when custom is chosen; never purple
  density: 'comfortable',
  reducedMotion: false,
  defaultSortBy: 'updatedAt',
  defaultSortOrder: 'desc',
  viewMode: 'grid',
  globalShortcut: DEFAULT_GLOBAL_SHORTCUT,
  versionHistoryLimit: 10,
  sidebarCollapsed: false
};

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-coding', name: 'برنامه‌نویسی و توسعه', nameEn: 'Software Engineering', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-writing', name: 'نگارش و تولید محتوا', nameEn: 'Writing & Content', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-analysis', name: 'تحلیل داده و پژوهش', nameEn: 'Analysis & Research', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-productivity', name: 'بهره‌وری و کار روزانه', nameEn: 'Productivity & Workflow', createdAt: '2026-01-01T00:00:00.000Z' }
];

export const DEFAULT_BLOCKS: ReusableBlock[] = [
  {
    id: 'blk-role-senior-dev',
    title: 'مهندس ارشد نرم‌افزار / Senior Software Engineer',
    type: 'role',
    content: 'Act as a senior software architect and principal engineer with deep expertise in clean code, security, and maintainable system design.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'blk-role-editor',
    title: 'ویراستار تخصصی و نویسنده فنی / Technical Editor',
    type: 'role',
    content: 'شما یک ویراستار حرفه‌ای و نویسنده فنی هستید که متون را با لحنی دقیق، شفاف، بدون حاشیه و کاملاً ساختاریافته بازنویسی می‌کنید.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'blk-constraints-production',
    title: 'محدودیت‌های کد عملیاتی / Production Code Constraints',
    type: 'constraints',
    content: '- Do not use placeholder comments or unfinished TODO blocks.\n- Handle edge cases and errors explicitly.\n- Prefer standard library solutions over heavy external dependencies.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'blk-output-markdown',
    title: 'قالب خروجی مارک‌داون ساختاریافته / Structured Markdown Output',
    type: 'output_format',
    content: 'ارائه خروجی در قالب Markdown استاندارد شامل: ۱. خلاصه اجرایی ۲. گام‌های عملیاتی ۳. جدول مقایسه یا چک‌لیست نهایی.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'blk-quality-verification',
    title: 'معیارهای کیفیت و صحت‌سنجی / Quality Criteria',
    type: 'quality_criteria',
    content: 'Ensure every recommendation is concrete, testable, free of generic filler, and directly addresses the core requirements.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: 'prm-code-review',
    title: 'بررسی تخصصی کد و بهینه‌سازی / Deep Code Review',
    description: 'بررسی جامع کد از نظر امنیت، کارایی، معماری و خوانایی به همراه پیشنهاد اصلاحی.',
    body: `لطفاً کد زیر را که به زبان {{programming_language}} برای پروژه {{project_name}} نوشته شده است بررسی کنید.

اهداف و نیازمندی‌ها:
{{requirements}}

لطفاً موارد زیر را به تفکیک تحلیل کنید:
1. باگ‌های احتمالی و حالت‌های مرزی (Edge Cases)
2. آسیب‌پذیری‌های امنیتی و مدیریت خطا
3. بهینه‌سازی کارایی و خوانایی کد
4. نسخه بازنویسی شده و استاندارد کد`,
    categoryId: 'cat-coding',
    tags: ['code-review', 'refactoring', 'بررسی-کد'],
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    isFavorite: true,
    isPinned: true,
    isDeleted: false,
    usageCount: 3,
    lastUsedAt: '2026-01-02T10:00:00.000Z',
    versions: []
  },
  {
    id: 'prm-tech-spec',
    title: 'طراحی مستند فنی سیستم / Technical Architecture Spec',
    description: 'Generate a clean, production-minded technical specification for a feature or microservice.',
    body: `Act as a Principal Systems Architect. Create a detailed technical design specification for {{project_name}}.

Primary Technology Stack: {{programming_language}}
Core Functional & Non-Functional Requirements:
{{requirements}}

Include:
1. Architecture Overview & Data Flow
2. Data Models & Schema Definitions
3. Error Handling & Resilience Strategy
4. Security Considerations
5. Verification & Testing Plan`,
    categoryId: 'cat-coding',
    tags: ['architecture', 'specification', 'معماری'],
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    isFavorite: true,
    isPinned: false,
    isDeleted: false,
    usageCount: 1,
    lastUsedAt: '2026-01-01T12:00:00.000Z',
    versions: []
  },
  {
    id: 'prm-meeting-summary',
    title: 'خلاصه‌سازی جلسه و استخراج اقدامات / Meeting Action Extractor',
    description: 'تبدیل یادداشت‌های پراکنده جلسه به مصوبات دقیق و لیست کارهای قابل پیگیری.',
    body: `متن زیر یادداشت‌های جلسه مربوط به موضوع «{{meeting_topic}}» است:

{{meeting_notes}}

لطفاً خروجی را در سه بخش تنظیم کن:
۱. خلاصه تصمیمات کلیدی (حداکثر ۵ مورد)
۲. جدول اقدامات بعدی (شامل: اقدام، مسئول، اولویت)
۳. ابهامات یا ریسک‌های نیازمند پیگیری در جلسه بعد`,
    categoryId: 'cat-productivity',
    tags: ['جلسه', 'بهره‌وری', 'خلاصه‌سازی', 'meetings'],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isFavorite: false,
    isPinned: true,
    isDeleted: false,
    usageCount: 2,
    lastUsedAt: '2026-01-02T09:00:00.000Z',
    versions: []
  }
];

export function createInitialDatabase(): AppDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    prompts: DEFAULT_PROMPTS.map(p => ({ ...p, tags: [...p.tags], versions: [...p.versions] })),
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    blocks: DEFAULT_BLOCKS.map(b => ({ ...b })),
    settings: { ...DEFAULT_SETTINGS }
  };
}
