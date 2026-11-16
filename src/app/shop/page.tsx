import { AppPage } from "@/components/app-page";
import { ShopExplorer, type ShopItem } from "@/components/shop-explorer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
type ListingRow = Omit<ShopItem, "imageSrc">;

export default async function ShopPage() {
  if (!isSupabaseConfigured()) {
    return <AppPage><ShopIntro /><p className="setup-notice">Connect Supabase to browse community listings.</p></AppPage>;
  }

  const admin = createSupabaseAdminClient();
  const listings: ListingRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin
      .from("shop_listings")
      .select("id, item_id, seller_id, seller_username, category, image_url, contact_email, contact_phone, length, width, price, description, issues")
      .eq("is_sold", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(`Could not load shop listings: ${error.message}`);
    listings.push(...data);
    if (data.length < 500) break;
  }

  const items: ShopItem[] = await Promise.all(listings.map(async (listing) => ({
    ...listing,
    imageSrc: await createClosetImageUrl(admin, listing.image_url),
  })));

  return (
    <AppPage>
      <ShopIntro />
      <ShopExplorer items={items} />
    </AppPage>
  );
}

function ShopIntro() {
  return (
    <section className="page-intro">
      <div><p className="eyebrow">SECOND LIFE, GOOD FINDS</p><h1>Built-in Shop</h1><p className="intro-copy">Clothing worth keeping in circulation.</p></div>
    </section>
  );
}
