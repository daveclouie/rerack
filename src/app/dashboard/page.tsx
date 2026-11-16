import Image from "next/image";
import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AppPage } from "@/components/app-page";
import { OutfitBuilder } from "@/components/outfit-builder";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClosetImageUrl } from "@/lib/supabase/closet-image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";
type OutfitSourceItem = Pick<Database["public"]["Tables"]["closet_items"]["Row"], "id" | "category" | "dominant_color" | "color_family" | "vibe_tag" | "ai_description" | "image_url">;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { anchor, message, error: actionError } = await searchParams;
  const anchorId = Array.isArray(anchor) ? anchor[0] : anchor;
  const statusMessage = Array.isArray(message) ? message[0] : message;
  const errorMessage = Array.isArray(actionError) ? actionError[0] : actionError;
  let greeting = "Welcome to ReRack";
  let itemCount = 0;
  let cleanCount = 0;
  let signedIn = false;
  let setupMessage: string | null = null;
  let cleanItems: Array<{
    id: string;
    category: string;
    dominant_color: string | null;
    color_family: "neutral" | "warm" | "cool" | "earth" | null;
    vibe_tag: "casual" | "streetwear" | "smart/formal" | "lounge/home" | null;
    ai_description: string | null;
    imageSrc: string | null;
  }> = [];

  if (!isSupabaseConfigured()) {
    setupMessage = "Connect Supabase to start your private wardrobe.";
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);

    if (user) {
      signedIn = true;
      const { data: profile, error: profileError } = await supabase.from("users").select("real_name").eq("id", user.id).maybeSingle();
      if (profileError) throw new Error(`Could not load profile: ${profileError.message}`);
      const realName = profile?.real_name || user.email || user.phone || "there";
      greeting = `Welcome back, ${realName}`;

      const [totalResult, cleanTotalResult] = await Promise.all([
        supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "clean"),
      ]);
      if (totalResult.error) throw new Error(`Could not load wardrobe count: ${totalResult.error.message}`);
      if (cleanTotalResult.error) throw new Error(`Could not load clean item count: ${cleanTotalResult.error.message}`);
      itemCount = totalResult.count ?? 0;
      cleanCount = cleanTotalResult.count ?? 0;
      const cleanRows: OutfitSourceItem[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase
          .from("closet_items")
          .select("id, category, dominant_color, color_family, vibe_tag, ai_description, image_url")
          .eq("user_id", user.id)
          .eq("status", "clean")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + 499);
        if (error) throw new Error(`Could not load clean items: ${error.message}`);
        cleanRows.push(...data);
        if (data.length < 500) break;
      }
      cleanItems = await Promise.all(cleanRows.map(async (item) => ({
        ...item,
        imageSrc: await createClosetImageUrl(supabase, item.image_url),
      })));
    }
  }

  return (
    <AppPage>
      <section className="page-intro dashboard-intro">
        <div>
          <p className="eyebrow">YOUR WARDROBE, CONSIDERED</p>
          <h1>{greeting}</h1>
          <p className="intro-copy">A clearer view of what you own, wear, and pass on.</p>
        </div>
        <div className="page-actions">
          {signedIn ? (
            <>
              <Link className="button button-dark" href="/closet/add">Add Items to Closet</Link>
              <Link className="button button-quiet" href="/closet">Closet Archive</Link>
            </>
          ) : (
            <><Link className="button button-dark" href="/signup">Create account</Link><Link className="button button-quiet" href="/login">Sign in</Link></>
          )}
        </div>
      </section>

      {setupMessage && <p className="setup-notice">{setupMessage} Add the keys in <code>.env.local</code>.</p>}
      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

      <section className="dashboard-grid" aria-label="Wardrobe overview">
        <div className="primary-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE CLOSET</p>
              <h2>{itemCount} pieces in your archive</h2>
            </div>
            <Link className="text-link" href="/profile">Profile settings <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="metric-row">
            <div><span className="metric-value">{cleanCount}</span><span className="metric-label">Clean and ready</span></div>
            <div><span className="metric-value">{itemCount - cleanCount}</span><span className="metric-label">In the laundry</span></div>
          </div>
          {cleanItems[0] && (
            <div className="recent-item">
              <div className="recent-image">
                {cleanItems[0].imageSrc && <Image src={cleanItems[0].imageSrc} alt="" fill sizes="100px" unoptimized />}
              </div>
              <div className="recent-copy"><span className="eyebrow">MOST RECENTLY ADDED</span><strong>{cleanItems[0].category}</strong><span>{cleanItems[0].dominant_color || cleanItems[0].color_family || "Color not set"}</span></div>
              <Link className="text-link" href="/closet">Open archive <span aria-hidden="true">→</span></Link>
            </div>
          )}
          <p className="shop-cta">Want to add items to your closet? <Link href="/shop">Browse our shop</Link></p>
        </div>
        <aside className="side-panel">
          <p className="eyebrow">IN CIRCULATION</p>
          <h2>Wear more of what you own.</h2>
          <p>Keep useful pieces in rotation, then give good finds a second life in the shop.</p>
          <Link className="text-link" href="/shop">Explore the built-in shop <span aria-hidden="true">→</span></Link>
          <div className="side-rule" />
          <p className="side-note">Clean pieces are the only ones in today&apos;s outfit roll.</p>
        </aside>
      </section>

      <OutfitBuilder key={anchorId ?? "daily"} items={cleanItems} anchorId={anchorId} message={statusMessage} />
    </AppPage>
  );
}
