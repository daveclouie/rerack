"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import type { Database } from "@/lib/supabase/database.types";
import { processClosetImage } from "@/services/aiClosetProcessor";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type CleanOutfitRow = Pick<Database["public"]["Tables"]["closet_items"]["Row"], "id" | "category" | "dominant_color" | "color_family" | "vibe_tag" | "ai_description" | "image_url" | "last_worn_date" | "created_at">;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function showActionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function getAccount() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error)) throw new Error(`Could not verify session: ${error.message}`);
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getCleanOutfitItems() {
  const { supabase, user } = await getAccount();
  const rows: CleanOutfitRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("closet_items")
      .select("id, category, dominant_color, color_family, vibe_tag, ai_description, image_url, last_worn_date, created_at")
      .eq("user_id", user.id)
      .eq("status", "clean")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(`Could not load clean outfit items: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) break;
  }
  return Promise.all(rows.map(async (item) => ({
    id: item.id,
    category: item.category,
    dominant_color: item.dominant_color,
    color_family: item.color_family,
    vibe_tag: item.vibe_tag,
    ai_description: item.ai_description,
    imageSrc: await createClosetImageUrl(supabase, item.image_url),
    last_worn_date: item.last_worn_date,
    created_at: item.created_at,
  })));
}

export async function addClosetItem(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) showActionError("/closet/add", "Choose a clothing photo.");
  if (file.size > 10 * 1024 * 1024) showActionError("/closet/add", "Images must be smaller than 10 MB.");

  const { supabase, user } = await getAccount();
  const { data: quotaAvailable, error: quotaError } = await supabase.rpc("consume_image_processing_quota");
  if (quotaError) throw new Error(`Could not check image-processing limit: ${quotaError.message}`);
  if (!quotaAvailable) showActionError("/closet/add", "Daily image-processing limit reached. Try again tomorrow.");

  let processed: Awaited<ReturnType<typeof processClosetImage>>;
  try {
    processed = await processClosetImage(Buffer.from(await file.arrayBuffer()), file.type);
  } catch (error) {
    if (error instanceof Error) showActionError("/closet/add", error.message);
    throw error;
  }
  const { normalizedImage, metadata } = processed;
  const imagePath = `${user.id}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("closet-images").upload(imagePath, normalizedImage, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) showActionError("/closet/add", `Could not upload normalized image: ${uploadError.message}`);

  const { error: insertError } = await supabase.from("closet_items").insert({
    user_id: user.id,
    image_url: imagePath,
    ...metadata,
  });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from("closet-images").remove([imagePath]);
    if (cleanupError) throw new Error(`Could not save item (${insertError.message}) or clean up its image (${cleanupError.message}).`);
    showActionError("/closet/add", `Could not save closet item: ${insertError.message}`);
  }

  redirect("/closet?message=Item added to your archive.");
}

export async function toggleLaundry(formData: FormData) {
  const id = value(formData, "item_id");
  if (!uuidPattern.test(id)) showActionError("/closet", "A valid closet item is required.");
  const { supabase, user } = await getAccount();
  const { data: item, error: readError } = await supabase
    .from("closet_items")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) showActionError("/closet", `Could not load closet item: ${readError.message}`);
  if (!item) showActionError("/closet", "Closet item not found.");

  const { data: updated, error } = await supabase
    .from("closet_items")
    .update({ status: item.status === "clean" ? "laundry" : "clean" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) showActionError("/closet", `Could not update laundry status: ${error.message}`);
  if (!updated) showActionError("/closet", "Closet item not found.");
  redirect("/closet?message=Item status updated.");
}

export async function deleteClosetItem(formData: FormData) {
  const id = value(formData, "item_id");
  if (!uuidPattern.test(id)) showActionError("/closet", "A valid closet item is required.");
  const { supabase, user } = await getAccount();
  const { data: item, error: readError } = await supabase
    .from("closet_items")
    .select("image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) showActionError("/closet", `Could not load closet item: ${readError.message}`);
  if (!item) showActionError("/closet", "Closet item not found.");

  const { data: deleted, error: deleteError } = await supabase
    .from("closet_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (deleteError) showActionError("/closet", `Could not delete closet item: ${deleteError.message}`);
  if (!deleted) showActionError("/closet", "Closet item not found.");

  if (item.image_url) {
    const { error: storageError } = await supabase.storage.from("closet-images").remove([item.image_url]);
    if (storageError) showActionError("/closet", `Item was deleted, but its image could not be removed: ${storageError.message}`);
  }
  redirect("/closet?message=Item deleted.");
}

export async function createShopListing(formData: FormData) {
  const itemId = value(formData, "item_id");
  const description = value(formData, "description");
  const issues = value(formData, "issues");
  const lengthText = value(formData, "length");
  const widthText = value(formData, "width");
  const priceText = value(formData, "price");
  const length = lengthText ? Number(lengthText) : null;
  const width = widthText ? Number(widthText) : null;
  const price = priceText ? Number(priceText) : Number.NaN;

  if (!uuidPattern.test(itemId)) showActionError("/closet", "A valid closet item is required.");
  if (!description || description.length > 500) showActionError("/closet", "Add a description of up to 500 characters.");
  if (!issues || issues.length > 500) showActionError("/closet", "Describe any issues, or enter 'No known issues'.");
  if ((length !== null && (!Number.isFinite(length) || length < 0 || length > 99999.99)) || (width !== null && (!Number.isFinite(width) || width < 0 || width > 99999.99))) {
    showActionError("/closet", "Size measurements must be between 0 and 99,999.99 cm.");
  }
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) showActionError("/closet", "Enter a price between $0 and $99,999,999.99.");
  const contactVisible = formData.get("contact_visible") === "on";

  const { supabase, user } = await getAccount();
  const { data: item, error: itemError } = await supabase
    .from("closet_items")
    .select("status, image_url")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemError) showActionError("/closet", `Could not load closet item: ${itemError.message}`);
  if (!item) showActionError("/closet", "Closet item not found.");
  if (item.status !== "clean") showActionError("/closet", "Only clean items can be listed.");
  if (!item.image_url) showActionError("/closet", "Add an item photo before listing it.");

  const { data: existing, error: existingError } = await supabase
    .from("shop_listings")
    .select("id")
    .eq("item_id", itemId)
    .maybeSingle();
  if (existingError) showActionError("/closet", `Could not check existing listings: ${existingError.message}`);
  if (existing) showActionError("/closet", "This item is already listed.");

  const { error } = await supabase.from("shop_listings").insert({
    item_id: itemId,
    seller_id: user.id,
    length,
    width,
    price,
    description,
    issues: issues || null,
    contact_visible: contactVisible,
  });
  if (error) showActionError("/closet", `Could not create listing: ${error.message}`);
  redirect("/closet?message=Your item is listed in the shop.");
}

export async function setListingContactVisibility(formData: FormData) {
  const itemId = value(formData, "item_id");
  if (!uuidPattern.test(itemId)) showActionError("/closet", "A valid closet item is required.");
  const { supabase, user } = await getAccount();
  const { data: listing, error } = await supabase
    .from("shop_listings")
    .update({ contact_visible: formData.get("contact_visible") === "on" })
    .eq("item_id", itemId)
    .eq("seller_id", user.id)
    .select("id, contact_visible")
    .maybeSingle();
  if (error) showActionError("/closet", `Could not update listing privacy: ${error.message}`);
  if (!listing) showActionError("/closet", "Shop listing not found.");
  redirect(`/closet?message=${encodeURIComponent(listing.contact_visible ? "Contact details are visible on this listing." : "Contact details are hidden on this listing.")}`);
}

export async function wearOutfit(formData: FormData) {
  const itemIds = [...new Set(formData.getAll("item_id").map(String))];
  if (itemIds.length === 0 || itemIds.length > 4 || itemIds.some((id) => !uuidPattern.test(id))) {
    showActionError("/dashboard", "Choose one to four valid closet items.");
  }

  const { supabase } = await getAccount();
  const { data, error } = await supabase.rpc("mark_items_worn", {
    p_item_ids: itemIds,
    p_worn_on: new Date().toISOString().slice(0, 10),
  });
  if (error) showActionError("/dashboard", `Could not record today's outfit: ${error.message}`);
  if (data.length !== itemIds.length) showActionError("/dashboard", "One or more outfit items are no longer clean. Generate a new outfit.");
  redirect("/dashboard?message=Today's outfit is in your wear history.");
}
