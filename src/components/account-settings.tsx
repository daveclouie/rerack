"use client";

import { useEffect, useRef } from "react";
import {
  completeContactChange,
  completePasswordChange,
  logoutEverywhere,
  startContactChange,
  startPasswordChange,
  updateProfile,
} from "@/app/actions/auth";
import { deleteAccount } from "@/app/actions/account";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";

type AccountProfile = {
  real_name: string;
  username: string;
  email: string | null;
};

export function AccountSettings({
  profile,
  lastSignIn,
  challenge,
  error,
  message,
}: {
  profile: AccountProfile;
  lastSignIn: string | null;
  challenge?: string;
  error?: string;
  message?: string;
}) {
  const editDialog = useRef<HTMLDialogElement>(null);
  const passwordDialog = useRef<HTMLDialogElement>(null);
  const contactDialog = useRef<HTMLDialogElement>(null);
  const verifyDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (challenge === "password" || challenge === "contact") verifyDialog.current?.showModal();
    if (challenge === "profile") editDialog.current?.showModal();
    if (challenge === "password-form") passwordDialog.current?.showModal();
    if (challenge === "contact-form") contactDialog.current?.showModal();
    if (challenge === "delete") deleteDialog.current?.showModal();
  }, [challenge]);

  return (
    <div className="account-settings">
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="setup-notice" role="status">{message}</p>}
      <section className="settings-section">
        <p className="eyebrow">YOUR DETAILS</p>
        <h2>Profile</h2>
        <div className="content-row"><span className="content-label">Name</span><span className="content-value">{profile.real_name}</span></div>
        <div className="content-row"><span className="content-label">Username</span><span className="content-value">@{profile.username}</span></div>
        <div className="content-row"><span className="content-label">Email</span><span className="content-value">{profile.email || "Not set"}</span></div>
        <div className="page-actions">
          <button className="button button-dark" type="button" onClick={() => editDialog.current?.showModal()}>Edit profile</button>
          <button className="button button-quiet" type="button" onClick={() => contactDialog.current?.showModal()}>Change email</button>
        </div>
      </section>

      <section className="settings-section">
        <p className="eyebrow">ACCOUNT & SECURITY</p>
        <h2>Password & sessions</h2>
        <p className="settings-description">Last sign-in: {lastSignIn ? new Date(lastSignIn).toLocaleString() : "Not available"}.</p>
        <div className="page-actions">
          <button className="button button-dark" type="button" onClick={() => passwordDialog.current?.showModal()}>Change password</button>
          <form action={logoutEverywhere}><SubmitButton className="button button-quiet" pendingLabel="Signing out…">Sign out everywhere</SubmitButton></form>
        </div>
        <p className="form-hint">Supabase manages login sessions. Signing out everywhere ends all active sessions.</p>
      </section>

      <section className="settings-section" id="privacy">
        <p className="eyebrow">YOUR DATA</p>
        <h2>Privacy & data</h2>
        <p className="settings-description">Closet items are private. Your email appears on a listing only after you choose to show it.</p>
        <div className="page-actions">
          <a className="button button-quiet" href="/api/account/export">Export my data</a>
          <button className="button button-danger" type="button" onClick={() => deleteDialog.current?.showModal()}>Delete account</button>
        </div>
        <p className="form-hint">Export downloads your profile, closet records, and listings as JSON. Image links expire after one hour. Deleting your account removes its closet records, listings, and stored images.</p>
      </section>

      <dialog className="confirm-dialog" ref={editDialog}>
        <DialogHeading eyebrow="PROFILE DETAILS" title="Edit profile" close={() => editDialog.current?.close()} />
        <form className="auth-form" action={updateProfile}>
          <div className="field"><label htmlFor="edit-real-name">Real name</label><input id="edit-real-name" name="real_name" autoComplete="name" defaultValue={profile.real_name} maxLength={100} required /></div>
          <div className="field"><label htmlFor="edit-username">Username</label><input id="edit-username" name="username" autoComplete="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" required /></div>
          <div className="page-actions"><SubmitButton className="button button-dark" pendingLabel="Saving…">Save profile</SubmitButton><button className="button button-quiet" type="button" onClick={() => editDialog.current?.close()}>Cancel</button></div>
        </form>
      </dialog>

      <dialog className="confirm-dialog" ref={passwordDialog}>
        <DialogHeading eyebrow="ACCOUNT & SECURITY" title="Change password" close={() => passwordDialog.current?.close()} />
        <p className="form-hint">We’ll send a verification code to your email.</p>
        <form className="auth-form" action={startPasswordChange}>
          <div className="page-actions"><SubmitButton className="button button-dark" pendingLabel="Sending code…">Send email code</SubmitButton><button className="button button-quiet" type="button" onClick={() => passwordDialog.current?.close()}>Cancel</button></div>
        </form>
      </dialog>

      <dialog className="confirm-dialog" ref={contactDialog}>
        <DialogHeading eyebrow="ACCOUNT & SECURITY" title="Change email address" close={() => contactDialog.current?.close()} />
        <p className="form-hint">A verification code will be sent to your new email address. Supabase may also notify your existing email.</p>
        <form className="auth-form" action={startContactChange}>
          <PasswordField id="current-password-contact" name="current_password" label="Current password" />
          <div className="field"><label htmlFor="new-email">New email address</label><input id="new-email" name="new_email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="page-actions"><SubmitButton className="button button-dark" pendingLabel="Sending code…">Send verification code</SubmitButton><button className="button button-quiet" type="button" onClick={() => contactDialog.current?.close()}>Cancel</button></div>
        </form>
      </dialog>

      <dialog className="confirm-dialog" ref={verifyDialog}>
        <DialogHeading eyebrow="VERIFY YOUR ACCOUNT" title={challenge === "password" ? "Set a new password" : "Confirm email change"} close={() => verifyDialog.current?.close()} />
        {challenge === "password" ? (
          <form className="auth-form" action={completePasswordChange}>
            <div className="field"><label htmlFor="password-code">Email verification code</label><input id="password-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required /></div>
            <PasswordField id="new-password" name="new_password" label="New password" autoComplete="new-password" />
            <SubmitButton className="button button-dark" pendingLabel="Updating…">Verify and change password</SubmitButton>
          </form>
        ) : (
          <form className="auth-form" action={completeContactChange}>
            <div className="field"><label htmlFor="contact-code">Code sent to your new email</label><input id="contact-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required /></div>
            <SubmitButton className="button button-dark" pendingLabel="Verifying…">Verify email</SubmitButton>
          </form>
        )}
      </dialog>

      <dialog className="confirm-dialog danger-dialog" ref={deleteDialog}>
        <DialogHeading eyebrow="PERMANENT ACTION" title="Delete your account?" close={() => deleteDialog.current?.close()} />
        <p>This permanently removes your account, closet items, listings, and stored photos. This cannot be undone.</p>
        <form className="auth-form" action={deleteAccount}>
          <div className="field"><label htmlFor="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" name="confirmation" autoComplete="off" required /></div>
          <PasswordField id="delete-password" label="Current password" />
          <div className="page-actions"><SubmitButton className="button button-danger" pendingLabel="Deleting account…">Delete account permanently</SubmitButton><button className="button button-quiet" type="button" onClick={() => deleteDialog.current?.close()}>Cancel</button></div>
        </form>
      </dialog>
    </div>
  );
}

function DialogHeading({ eyebrow, title, close }: { eyebrow: string; title: string; close: () => void }) {
  return <div className="dialog-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="dialog-close" type="button" onClick={close}>Close</button></div>;
}
