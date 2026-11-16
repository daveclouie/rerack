import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { SettingsPreferences } from "@/components/settings-preferences";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  return (
    <AppPage>
      <section className="page-intro"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="intro-copy">Make ReRack feel like your own.</p></div></section>
      <section className="settings-list" aria-label="Application settings">
        <div className="setting-row" id="appearance"><div><h2>Appearance</h2><p>Toggle cream and dark, or follow your device setting.</p></div><ThemeToggle /></div>
        <div className="setting-row"><div><h2>Account & security</h2><p>Update your profile and contact details, change your password, manage sessions, export data, or delete your account.</p></div><Link className="text-link" href="/profile">Manage account <span aria-hidden="true">→</span></Link></div>
      </section>
      <SettingsPreferences />
      <section className="settings-section" id="privacy">
        <p className="eyebrow">CONTROL & TRANSPARENCY</p>
        <h2>Privacy & data</h2>
        <p className="settings-description">Your closet is private. Contact details stay hidden on listings unless you explicitly choose to share them.</p>
        <div className="page-actions"><Link className="text-link" href="/profile#privacy">Export or delete account data <span aria-hidden="true">→</span></Link><Link className="text-link" href="/closet">Review closet listings <span aria-hidden="true">→</span></Link></div>
      </section>
      <section className="settings-section faq-section" id="faq">
        <p className="eyebrow">QUICK ANSWERS</p>
        <h2>FAQ</h2>
        <details><summary>Who can see my closet?</summary><p>Your closet is private to your account. Shop listings are public; your email is shared only when you opt in for that listing.</p></details>
        <details><summary>How are outfit suggestions made?</summary><p>ReRack uses your clean pieces, selected vibe, and color-family harmony. You can manually select and lock any slot.</p></details>
        <details><summary>Can I change my email address?</summary><p>Yes. Account &amp; security verifies the new email address before applying the change.</p></details>
        <details><summary>What happens when I delete my account?</summary><p>Your profile, closet records, shop listings, and stored closet images are permanently deleted after you confirm with your password.</p></details>
      </section>
      <p className="last-updated">Settings content last updated: <time dateTime="2026-11-16">16 Nov 2026</time></p>
    </AppPage>
  );
}
