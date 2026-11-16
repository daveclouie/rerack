import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function createClosetImageUrl(client: SupabaseClient<Database>, imagePath: string | null) {
  if (!imagePath) return null;
  const { data, error } = await client.storage.from("closet-images").createSignedUrl(imagePath, 3600);
  if (error) throw new Error(`Could not create image URL: ${error.message}`);
  return data.signedUrl;
}
