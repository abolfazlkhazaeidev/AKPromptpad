import { PromptItem, PromptVersion } from './types';
import { normalizeForComparison } from './duplicates';

/**
 * Determines if a meaningful change occurred between the previous prompt state and the updated fields.
 * Prevents creating version history noise when nothing changed or only whitespace changed.
 */
export function hasMeaningfulPromptChange(
  previous: Pick<PromptItem, 'title' | 'body' | 'description'>,
  next: Pick<PromptItem, 'title' | 'body' | 'description'>
): boolean {
  return (
    normalizeForComparison(previous.title) !== normalizeForComparison(next.title) ||
    normalizeForComparison(previous.body) !== normalizeForComparison(next.body) ||
    normalizeForComparison(previous.description || '') !== normalizeForComparison(next.description || '')
  );
}

/**
 * Appends the previous state of a prompt to its version history array and enforces the max history limit.
 */
export function recordPromptVersion(
  currentPrompt: PromptItem,
  nextFields: Pick<PromptItem, 'title' | 'body' | 'description'>,
  maxVersions = 10,
  versionIdGenerator: () => string = () => `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
): PromptVersion[] {
  const limit = Math.max(1, Math.min(50, maxVersions || 10));
  if (!hasMeaningfulPromptChange(currentPrompt, nextFields)) {
    return currentPrompt.versions || [];
  }

  const snapshot: PromptVersion = {
    id: versionIdGenerator(),
    title: currentPrompt.title,
    body: currentPrompt.body,
    description: currentPrompt.description || '',
    timestamp: currentPrompt.updatedAt || new Date().toISOString()
  };

  const existing = Array.isArray(currentPrompt.versions) ? currentPrompt.versions : [];
  return [snapshot, ...existing].slice(0, limit);
}
