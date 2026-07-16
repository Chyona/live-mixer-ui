const KEYWORD_SEPARATOR_RE = /[,，+＋\s]+/;

/**
 * 解析列表搜索关键词：支持「A+B」「A B」「A,B」等分隔。
 */
export function parseListKeywords(input?: string | null): string[] {
  if (!input?.trim()) return [];
  return input
    .split(KEYWORD_SEPARATOR_RE)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 多关键词全部命中（AND）。
 */
export function matchListKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const lower = text.toLowerCase();
  return keywords.every((keyword) => lower.includes(keyword.toLowerCase()));
}

/**
 * 列表搜索关键词规范化：统一为逗号分隔后传给后端。
 */
export function toApiKeywords(input?: string | null): string | undefined {
  const keywords = parseListKeywords(input);
  return keywords.length ? keywords.join(',') : undefined;
}
