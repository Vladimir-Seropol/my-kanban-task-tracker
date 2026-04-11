/** Путь объекта в бакете `avatars` из публичного URL Supabase Storage. */
export function avatarsBucketPathFromPublicUrl(publicUrl: string): string | null {
  if (!publicUrl?.trim()) return null;
  const marker = "/object/public/avatars/";
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  let rest = publicUrl.slice(i + marker.length);
  const q = rest.search(/[?#]/);
  if (q !== -1) rest = rest.slice(0, q);
  try {
    const decoded = decodeURIComponent(rest);
    return decoded || null;
  } catch {
    return null;
  }
}
