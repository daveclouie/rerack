import { AppPage } from "@/components/app-page";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword } from "@/app/actions/auth";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { error } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password.</h1></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="auth-form" action={updatePassword}>
          <PasswordField id="password" label="New password" autoComplete="new-password" />
          <SubmitButton className="button button-dark" pendingLabel="Updating password…">Update password</SubmitButton>
        </form>
      </section>
    </AppPage>
  );
}
