import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type ClosetExportRow = Pick<Database["public"]["Tables"]["closet_items"]["Row"], "id" | "category" | "dominant_color" | "color_family" | "vibe_tag" | "ai_description" | "image_url" | "status" | "wear_count" | "last_worn_date" | "created_at">;
type ListingExportRow = Pick<Database["public"]["Tables"]["shop_listings"]["Row"], "item_id" | "seller_username" | "category" | "contact_visible" | "length" | "width" | "price" | "description" | "issues" | "is_sold" | "created_at">;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) {
    throw new Error(`Could not verify session: ${authError.message}`);
  }
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const profileResult = await supabase.from("users").select("real_name, username, email, created_at").eq("id", user.id).maybeSingle();
  if (profileResult.error) throw new Error(`Could not export profile: ${profileResult.error.message}`);
  const closetItems: ClosetExportRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("closet_items")
      .select("id, category, dominant_color, color_family, vibe_tag, ai_description, image_url, status, wear_count, last_worn_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(`Could not export closet: ${error.message}`);
    closetItems.push(...data);
    if (data.length < 500) break;
  }
  const shopListings: ListingExportRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("shop_listings")
      .select("item_id, seller_username, category, contact_visible, length, width, price, description, issues, is_sold, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .order("item_id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(`Could not export shop listings: ${error.message}`);
    shopListings.push(...data);
    if (data.length < 500) break;
  }

  const closet: Array<ClosetExportRow & { image_download_url: string | null }> = [];
  for (let offset = 0; offset < closetItems.length; offset += 50) {
    const batch = closetItems.slice(offset, offset + 50);
    closet.push(...await Promise.all(batch.map(async (item) => ({
      ...item,
      image_download_url: await createClosetImageUrl(supabase, item.image_url),
    }))));
  }
  const exportData = {
    exported_at: new Date().toISOString(),
    note: "Image download links expire after one hour.",
    profile: profileResult.data,
    closet,
    shop_listings: shopListings,
  };
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="rerack-account-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
