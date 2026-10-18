import { DuplicateCheckResult, PromptItem } from './types';

/**
 * Normalizes text for exact duplicate comparison:
 * converts CRLF to LF, trims outer whitespace, and collapses redundant internal whitespace.
 */
export function normalizeForComparison(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\r\n/g, '\n').trim();
}

/**
 * Checks if a candidate prompt (title + body) is an exact duplicate of an existing non-deleted prompt.
 * Optionally excludes a prompt ID (e.g., when editing an existing prompt).
 */
export function findExactDuplicate(
  candidate: { title: string; body: string },
  existingPrompts: PromptItem[],
  excludePromptId?: string
): DuplicateCheckResult {
  const normTitle = normalizeForComparison(candidate.title).toLowerCase();
  const normBody = normalizeForComparison(candidate.body);

  if (!normTitle && !normBody) {
    return { isDuplicate: false };
  }

  for (const item of existingPrompts) {
    if (item.isDeleted) continue;
    if (excludePromptId && item.id === excludePromptId) continue;

    const itemTitle = normalizeForComparison(item.title).toLowerCase();
    const itemBody = normalizeForComparison(item.body);

    if (normTitle && normBody && itemTitle === normTitle && itemBody === normBody) {
      return {
        isDuplicate: true,
        existingPrompt: item,
        matchType: 'title_and_body'
      };
    }

    if (normBody && itemBody === normBody) {
      return {
        isDuplicate: true,
        existingPrompt: item,
        matchType: 'exact_body'
      };
    }
  }

  return { isDuplicate: false };
}
