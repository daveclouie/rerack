import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { signIn } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, message } = await searchParams;
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
          <div className="field"><label htmlFor="identifier">Username, email or phone</label><input id="identifier" name="identifier" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          <button className="button button-dark" type="submit">Sign in</button>
        </form>
        <p className="auth-footer"><Link href="/forgot-password">Forgot your password?</Link></p>
        <p className="auth-footer">New to ReRack? <Link href="/signup">Create an account</Link></p>
      </section>
    </AppPage>
  );
}
