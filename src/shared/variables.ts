// Template variable parser for {{var_name}} tokens.
// Kept intentionally regex-based (no eval/Function) so user templates can't execute arbitrary JS.

// Valid variable names: letters (including Unicode/Persian/English), numbers, underscores, hyphens, 1 to 64 chars
const VARIABLE_TOKEN_REGEX = /\{\{\s*([^{}\s][^{}]{0,62}?[^{}\s]|[a-zA-Z0-9_\u0600-\u06FF])\s*\}\}/g;
const VALID_NAME_REGEX = /^[a-zA-Z0-9_\-\u0600-\u06FF]{1,64}$/;

export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return VALID_NAME_REGEX.test(trimmed);
}

// Preserves first-seen order so form inputs match the visual order in the prompt body.
export function extractVariables(template: string): string[] {
  if (!template || typeof template !== 'string') return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of template.matchAll(VARIABLE_TOKEN_REGEX)) {
    const rawName = match[1]?.trim();
    if (rawName && isValidVariableName(rawName) && !seen.has(rawName)) {
      seen.add(rawName);
      result.push(rawName);
    }
  }
  return result;
}

export interface CompileOptions {
  /**
   * When true (default), leaving a variable value empty keeps {{variable_name}} placeholder
   * in preview or replaces it with empty string if fallbackToEmpty is true.
   */
  keepPlaceholderOnEmpty?: boolean;
}

// Single-pass replacement prevents recursive expansion if a user's input value itself contains '{{...}}'.
export function compileTemplate(
  template: string,
  values: Record<string, string>,
  options: CompileOptions = { keepPlaceholderOnEmpty: false }
): string {
  if (!template || typeof template !== 'string') return '';
  return template.replace(VARIABLE_TOKEN_REGEX, (fullMatch, rawName: string) => {
    const name = rawName?.trim();
    if (!name || !isValidVariableName(name)) {
      return fullMatch;
    }
    const provided = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : undefined;
    if (provided === undefined || provided === '') {
      return options.keepPlaceholderOnEmpty ? `{{${name}}}` : '';
    }
    return String(provided);
  });
}

/**
 * Determines whether a variable likely benefits from a multiline textarea
 * based on common naming heuristics or existing multiline value.
 */
export function isMultilineVariable(name: string, currentValue = ''): boolean {
  if (currentValue.includes('\n')) return true;
  const lower = name.toLowerCase();
  const multilineHints = [
    'requirements',
    'context',
    'code',
    'notes',
    'body',
    'content',
    'text',
    'description',
    'list',
    'data',
    'input',
    'نیازمندی',
    'متن',
    'توضیحات',
    'یادداشت',
    'کد'
  ];
  return multilineHints.some(hint => lower.includes(hint));
}
