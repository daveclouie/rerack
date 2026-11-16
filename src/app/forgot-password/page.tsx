import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { completePhoneRecovery, startRecovery } from "@/app/actions/auth";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { error, sent, step } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>{step === "verify" ? "Check your phone." : "Let's get you back in."}</h1>
          <p className="intro-copy">Verify the name and contact method on your account.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {sent && <p className="setup-notice" role="status">If those details match an account, recovery instructions are on their way.</p>}
        {step === "verify" ? (
          <form className="auth-form" action={completePhoneRecovery}>
            <div className="field"><label htmlFor="code">Text message code</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required /></div>
            <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
            <button className="button button-dark" type="submit">Reset password</button>
          </form>
        ) : !sent ? (
          <form className="auth-form" action={startRecovery}>
            <div className="field"><label htmlFor="real_name">Real name</label><input id="real_name" name="real_name" autoComplete="name" required /></div>
            <div className="field"><label htmlFor="identifier">Email address or phone number</label><input id="identifier" name="identifier" autoComplete="email" required /></div>
            <button className="button button-dark" type="submit">Continue</button>
          </form>
        ) : null}
        <p className="auth-footer"><Link href="/login">Return to sign in</Link></p>
      </section>
    </AppPage>
  );
}
