import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AppPage } from "@/components/app-page";
import { OutfitBuilder } from "@/components/outfit-builder";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getTheArchiveUrl() {
  const value = process.env.NEXT_PUBLIC_THEARCHIVE_URL?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_THEARCHIVE_URL must be a valid absolute URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_THEARCHIVE_URL must use HTTP or HTTPS.");
  }
  return url.toString();
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { anchor, message, error: actionError } = await searchParams;
  const anchorId = Array.isArray(anchor) ? anchor[0] : anchor;
  const statusMessage = Array.isArray(message) ? message[0] : message;
  const errorMessage = Array.isArray(actionError) ? actionError[0] : actionError;
  const theArchiveUrl = getTheArchiveUrl();
  let greeting = "Welcome to ReRack";
  let signedIn = false;
  let setupMessage: string | null = null;

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
      const realName = profile?.real_name || user.email || "there";
      greeting = `Welcome back, ${realName}`;
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
              <p className="eyebrow">YOUR CLOSET</p>
              <h2>Your pieces, in one place.</h2>
            </div>
            <Link className="text-link" href="/profile">Profile settings <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="intro-copy">Your clothing and its day-to-day details live in your closet archive.</p>
          <div className="page-actions"><Link className="button button-quiet" href="/closet">Open closet archive</Link></div>
          <p className="shop-cta">Want to add thrifted items to your closet? {theArchiveUrl ? <a href={theArchiveUrl} target="_blank" rel="noreferrer">Browse our shop</a> : <span>Browse our shop (TheArchive link coming soon)</span>}</p>
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

      {signedIn && <OutfitBuilder key={anchorId ?? "daily"} anchorId={anchorId} message={statusMessage} />}
    </AppPage>
  );
}
