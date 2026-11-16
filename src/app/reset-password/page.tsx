import { AppPage } from "@/components/app-page";
import { updatePassword } from "@/app/actions/auth";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { error } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password.</h1></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="auth-form" action={updatePassword}>
          <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
          <button className="button button-dark" type="submit">Update password</button>
        </form>
      </section>
    </AppPage>
  );
}
