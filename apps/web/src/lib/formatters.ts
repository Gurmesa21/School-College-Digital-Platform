/**
 * Day 21 UI/UX Polish: Reusable text formatting and word-safe truncation helpers
 * Prevents mid-word string slicing and duplicated ellipses across all cards.
 */

export function truncateWords(text: string | null | undefined, maxChars: number = 120): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  // Slice up to maxChars, then back up to the nearest word boundary
  const sub = trimmed.slice(0, maxChars);
  const lastSpace = sub.lastIndexOf(' ');
  const cleanSub = lastSpace > maxChars * 0.6 ? sub.slice(0, lastSpace) : sub;

  // Strip trailing punctuation (dots, commas, dashes) to avoid "...." or ",..."
  const sanitized = cleanSub.replace(/[.,;:!?\s-]+$/, '');
  return `${sanitized}…`;
}

export function cleanTag(tag: string): string {
  if (!tag) return '';
  // Remove leading '#' or extra whitespace
  return tag.replace(/^#+\s*/, '').trim();
}

