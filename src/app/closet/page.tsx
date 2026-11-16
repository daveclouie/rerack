import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AppPage } from "@/components/app-page";
import { ClosetArchive, type ArchiveItem } from "@/components/closet-archive";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";
type ClosetRow = Pick<Database["public"]["Tables"]["closet_items"]["Row"], "id" | "category" | "dominant_color" | "color_family" | "vibe_tag" | "ai_description" | "image_url" | "status" | "wear_count" | "last_worn_date" | "created_at">;

export default async function ClosetPage({ searchParams }: PageProps<"/closet">) {
  const { error: formError, message } = await searchParams;
  if (!isSupabaseConfigured()) {
    return <AppPage><ArchiveIntro /><p className="setup-notice">Connect Supabase to load your closet archive.</p></AppPage>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  if (!user) {
    return (
      <AppPage>
        <ArchiveIntro />
        <section className="empty-shop"><h2>Your archive is private to you.</h2><p>Sign in to see the pieces you&apos;ve added.</p><div className="page-actions"><Link className="button button-dark" href="/login">Sign in</Link><Link className="button button-quiet" href="/signup">Create account</Link></div></section>
      </AppPage>
    );
  }

  const rows: ClosetRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("closet_items")
      .select("id, category, dominant_color, color_family, vibe_tag, ai_description, image_url, status, wear_count, last_worn_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(`Could not load closet archive: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) break;
  }

  const { data: listings, error: listingsError } = await supabase
    .from("shop_listings")
    .select("item_id, contact_visible")
    .eq("seller_id", user.id);
  if (listingsError) throw new Error(`Could not load listing status: ${listingsError.message}`);
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Could not load listing contact preview: ${profileError.message}`);
  const listingByItem = new Map(listings.map((listing) => [listing.item_id, listing.contact_visible]));
  const items: ArchiveItem[] = await Promise.all(rows.map(async (item) => ({
    ...item,
    imageSrc: await createClosetImageUrl(supabase, item.image_url),
    isListed: listingByItem.has(item.id),
    contactVisible: listingByItem.get(item.id) ?? false,
  })));

  return (
    <AppPage>
      <ArchiveIntro />
      {formError && <p className="form-error" role="alert">{formError}</p>}
      {message && <p className="setup-notice" role="status">{message}</p>}
      <ClosetArchive items={items} contactEmail={profile?.email ?? null} />
    </AppPage>
  );
}

function ArchiveIntro() {
  return (
    <section className="page-intro">
      <div><Link className="back-link" href="/dashboard">← Back to dashboard</Link><p className="eyebrow">YOUR PIECES, IN CONTEXT</p><h1>Closet archive</h1><p className="intro-copy">A working record of what you own and what you wear.</p></div>
      <Link className="button button-dark" href="/closet/add">Add Items to Closet</Link>
    </section>
  );
}
