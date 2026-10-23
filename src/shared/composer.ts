import { ComposerBlockType, Language, ReusableBlock } from './types';

export const BLOCK_TYPE_LABELS: Record<ComposerBlockType, { fa: string; en: string }> = {
  role: { fa: 'نقش (Role)', en: 'Role' },
  objective: { fa: 'هدف اصلی (Objective)', en: 'Objective' },
  context: { fa: 'زمینه و اطلاعات پایه (Context)', en: 'Context' },
  requirements: { fa: 'نیازمندی‌ها (Requirements)', en: 'Requirements' },
  constraints: { fa: 'محدودیت‌ها و قوانین (Constraints)', en: 'Constraints' },
  output_format: { fa: 'قالب خروجی (Output Format)', en: 'Output Format' },
  quality_criteria: { fa: 'معیارهای کیفیت (Quality Criteria)', en: 'Quality Criteria' },
  additional_instructions: { fa: 'دستورالعمل‌های تکمیلی (Additional Instructions)', en: 'Additional Instructions' }
};

export interface ComposerAssemblyOptions {
  includeSectionHeaders: boolean;
  headerLanguage: Language;
  customGoalText?: string;
}

/**
 * Deterministically assembles selected reusable blocks (and optional custom goal text) into a single prompt.
 * Never calls any external AI API.
 */
export function assemblePromptFromBlocks(
  selectedBlocks: ReusableBlock[],
  options: ComposerAssemblyOptions
): string {
  const sections: string[] = [];

  for (const block of selectedBlocks) {
    const trimmed = block.content.trim();
    if (!trimmed) continue;

    if (options.includeSectionHeaders) {
      const label = BLOCK_TYPE_LABELS[block.type]?.[options.headerLanguage] || block.title;
      sections.push(`### ${label}\n${trimmed}`);
    } else {
      sections.push(trimmed);
    }
  }

  if (options.customGoalText && options.customGoalText.trim()) {
    const customTrimmed = options.customGoalText.trim();
    if (options.includeSectionHeaders) {
      const header = options.headerLanguage === 'fa' ? '### جزئیات اختصاصی' : '### Specific Details';
      sections.push(`${header}\n${customTrimmed}`);
    } else {
      sections.push(customTrimmed);
    }
  }

  return sections.join('\n\n');
}
