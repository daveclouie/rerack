import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { startRecovery } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { error, sent } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>Let&apos;s get you back in.</h1>
          <p className="intro-copy">Verify the name and email address on your account.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {sent && <p className="setup-notice" role="status">If those details match an account, recovery instructions are on their way.</p>}
        {!sent ? (
          <form className="auth-form" action={startRecovery}>
            <div className="field"><label htmlFor="real_name">Real name</label><input id="real_name" name="real_name" autoComplete="name" required /></div>
            <div className="field"><label htmlFor="identifier">Email address</label><input id="identifier" name="identifier" type="email" autoComplete="email" required /></div>
            <SubmitButton className="button button-dark" pendingLabel="Checking account…">Continue</SubmitButton>
          </form>
        ) : null}
        <p className="auth-footer"><Link href="/login">Return to sign in</Link></p>
      </section>
    </AppPage>
  );
}
