import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, message, next } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Pick up where you left off.</h1>
          <p className="intro-copy">Sign in to your ReRack account.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="setup-notice" role="status">{message}</p>}
        <form className="auth-form" action={signIn}>
          <input type="hidden" name="next" value={Array.isArray(next) ? next[0] : next ?? ""} />
          <div className="field"><label htmlFor="identifier">Username or email</label><input id="identifier" name="identifier" autoComplete="username" required /></div>
          <PasswordField id="password" />
          <SubmitButton className="button button-dark" pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>
        <p className="auth-footer"><Link href="/forgot-password">Forgot your password?</Link></p>
        <p className="auth-footer">New to ReRack? <Link href="/signup">Create an account</Link></p>
      </section>
    </AppPage>
  );
}
