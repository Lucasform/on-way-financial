"use client";

import type { createSupabaseBrowser } from "@/lib/supabase/client";
import { sanitizeFilename } from "@/lib/utils";

export async function uploadObraFile(
  supabase: ReturnType<typeof createSupabaseBrowser>,
  bucket: "obra-gallery" | "obra-documents",
  householdId: string,
  moduleId: string,
  file: File,
): Promise<{ url: string; path: string } | { error: string }> {
  const safe = sanitizeFilename(file.name);
  const path = `${householdId}/${moduleId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
  });
  if (error) return { error: error.message };
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: pub.publicUrl, path };
}
