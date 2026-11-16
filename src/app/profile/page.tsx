import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { updateProfile } from "@/app/actions/auth";
import { AppPage } from "@/components/app-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { error: formError, message } = await searchParams;
  if (!isSupabaseConfigured()) {
    return <AppPage><ProfileIntro /><p className="setup-notice">Connect Supabase to load and update your profile.</p></AppPage>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  const { data: profile, error } = user
    ? await supabase.from("users").select("real_name, username, email, phone_number").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(`Could not load profile: ${error.message}`);

  return (
    <AppPage>
      <ProfileIntro />
      {profile ? (
        <section className="content-column" aria-label="Profile details">
          {formError && <p className="form-error" role="alert">{formError}</p>}
          {message && <p className="setup-notice" role="status">{message}</p>}
          <form className="auth-form" action={updateProfile}>
            <div className="field"><label htmlFor="real_name">Real name</label><input id="real_name" name="real_name" autoComplete="name" defaultValue={profile.real_name} maxLength={100} required /></div>
            <div className="field"><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" required /></div>
            <button className="button button-dark" type="submit">Save profile</button>
          </form>
          <div className="content-row"><span className="content-label">Email</span><span className="content-value">{profile.email || "Not added"}</span></div>
          <div className="content-row"><span className="content-label">Phone</span><span className="content-value">{profile.phone_number || "Not added"}</span></div>
          <div className="page-actions"><Link className="text-link" href="/settings">Account settings <span aria-hidden="true">→</span></Link></div>
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
