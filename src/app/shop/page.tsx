import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { ShopExplorer, type ShopItem } from "@/components/shop-explorer";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  if (!isSupabaseConfigured()) {
    return <AppPage><ShopIntro /><p className="setup-notice">Connect Supabase to load community listings.</p></AppPage>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: listings, error } = await supabase
    .from("shop_listings")
    .select("id, item_id, seller_id, seller_username, category, image_url, contact_email, length, width, price, description, issues")
    .eq("is_sold", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load built-in shop listings: ${error.message}`);
  const items: ShopItem[] = await Promise.all(listings.map(async (listing) => ({
    ...listing,
    imageSrc: await createClosetImageUrl(supabase, listing.image_url),
  })));

  return (
    <AppPage>
      <ShopIntro />
      <ShopExplorer items={items} />
      <p className="shop-cta">Have a piece to pass on? <Link href="/closet">List it from your closet</Link></p>
    </AppPage>
  );
}

function ShopIntro() {
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">COMMUNITY CIRCULATION</p>
        <h1>Built-in shop</h1>
        <p className="intro-copy">Discover pieces other ReRack members are ready to pass on.</p>
      </div>
    </section>
  );
}
