/** Trim, lowerCase, снять ведущие #, вернуть с одним префиксом # (или пусто). */
export function normalizeTag(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(/^#+/, "");
  return clean ? `#${clean}` : "";
}

/** Строка поля «теги» (через запятую) → массив нормализованных тегов. */
export function parseTagsFromCommaInput(value: string): string[] {
  return value
    .split(",")
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

/** Массив тегов → строка для поля ввода. */
export function tagsArrayToCommaInput(tags?: string[]): string {
  return (tags ?? [])
    .map((t) => normalizeTag(t))
    .filter(Boolean)
    .join(", ");
}
