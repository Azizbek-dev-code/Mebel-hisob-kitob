/** JSON string arrays stored on learning goals and challenges. */

export function parseStringIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function serializeStringIdList(ids: readonly string[] | null | undefined): string | null {
  if (!ids || ids.length === 0) return null;
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))];
  return unique.length ? JSON.stringify(unique) : null;
}
