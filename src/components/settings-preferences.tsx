"use client";

import { useClientPreferences } from "@/lib/client-preferences";

export function SettingsPreferences() {
  const { preferences, update } = useClientPreferences();
  return (
    <>
      <section className="settings-section" id="notifications">
        <p className="eyebrow">YOUR ROUTINE</p>
        <h2>Notification preferences</h2>
        <p className="settings-description">Choose which in-app reminders appear on your dashboard. These are local to this browser; email and push alerts are not enabled.</p>
        <label className="preference-row"><input type="checkbox" checked={preferences.laundryReminder} onChange={(event) => update("laundryReminder", event.target.checked)} /><span><strong>Laundry check-in</strong><small>Show a reminder when pieces are waiting in laundry.</small></span></label>
        <label className="preference-row"><input type="checkbox" checked={preferences.rotationReminder} onChange={(event) => update("rotationReminder", event.target.checked)} /><span><strong>Bring a piece back into rotation</strong><small>Show a reminder for clean pieces not worn in over 60 days.</small></span></label>
      </section>
      <section className="settings-section" id="accessibility">
        <p className="eyebrow">COMFORT & ACCESS</p>
        <h2>Accessibility</h2>
        <label className="preference-row"><input type="checkbox" checked={preferences.highContrast} onChange={(event) => update("highContrast", event.target.checked)} /><span><strong>Increase contrast</strong><small>Strengthen borders and secondary text.</small></span></label>
        <label className="preference-row"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} /><span><strong>Reduce motion</strong><small>Limit animated and smooth-scrolling effects.</small></span></label>
      </section>
    </>
  );
}
