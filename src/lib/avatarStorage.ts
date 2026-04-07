import { supabase, supabaseUrl } from "./supabase";

const AVATARS_BUCKET = "avatars";

const getFileExt = (filename: string) => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
};

const isStorageAvatarUrl = (url?: string) =>
  Boolean(url?.includes(`/storage/v1/object/public/${AVATARS_BUCKET}/`));

const getStoragePathFromPublicUrl = (url: string) => {
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

export const uploadAvatarToStorage = async (file: File, role: "assignee" | "reporter") => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Не удалось определить пользователя.");

  const ext = getFileExt(file.name);
  const path = `${user.id}/${role}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const removeAvatarFromStorage = async (avatarUrl?: string) => {
  if (!avatarUrl || !isStorageAvatarUrl(avatarUrl)) return;
  if (!avatarUrl.startsWith(supabaseUrl)) return;

  const path = getStoragePathFromPublicUrl(avatarUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path]);
  if (error) {
    console.warn("Failed to remove old avatar from storage:", error.message);
  }
};
