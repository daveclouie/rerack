import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AccountSettings } from "@/components/account-settings";
import { AppPage } from "@/components/app-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { error: formError, message, challenge } = await searchParams;
  if (!isSupabaseConfigured()) {
    return <AppPage><ProfileIntro /><p className="setup-notice">Connect Supabase to load and update your profile.</p></AppPage>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  const { data: profile, error } = user
    ? await supabase.from("users").select("real_name, username, email").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(`Could not load profile: ${error.message}`);

  return (
    <AppPage>
      <ProfileIntro />
      {profile ? (
        <section className="content-column" aria-label="Account and profile settings">
          <AccountSettings
            profile={profile}
            lastSignIn={user?.last_sign_in_at ?? null}
            challenge={Array.isArray(challenge) ? challenge[0] : challenge}
            error={Array.isArray(formError) ? formError[0] : formError}
            message={Array.isArray(message) ? message[0] : message}
          />
          <div className="page-actions"><Link className="text-link" href="/settings">Preferences and accessibility <span aria-hidden="true">→</span></Link></div>
        </section>
      ) : (
        <section className="empty-shop"><h2>Your profile is ready when you are.</h2><p>Sign in or create an account to see your personal details.</p><div className="page-actions"><Link className="button button-dark" href="/login">Sign in</Link><Link className="button button-quiet" href="/signup">Create account</Link></div></section>
      )}
    </AppPage>
  );
}

function ProfileIntro() {
  return <section className="page-intro"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile settings</h1><p className="intro-copy">Your details, kept in one place.</p></div></section>;
}
