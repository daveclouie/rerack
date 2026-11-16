import { AppPage } from "@/components/app-page";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SettingsPage() {
  return (
    <AppPage>
      <section className="page-intro"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="intro-copy">Make ReRack feel like your own.</p></div></section>
      <section className="settings-list" aria-label="Application settings">
        <div className="setting-row"><div><h2>Appearance</h2><p>Choose the warm cream palette or a dark workspace.</p></div><ThemeToggle /></div>
        <div className="setting-row"><div><h2>Account services</h2><p>{isSupabaseConfigured() ? "Supabase connection is configured." : "Add your Supabase project keys to enable account services."}</p></div><span className="content-label">{isSupabaseConfigured() ? "Connected" : "Not connected"}</span></div>
      </section>
    </AppPage>
  );
}
