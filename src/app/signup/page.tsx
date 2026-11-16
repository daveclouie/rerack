import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { signUp } from "@/app/actions/auth";

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <div className="auth-intro">
          <p className="eyebrow">A BETTER VIEW OF YOUR CLOSET</p>
          <h1>Make room for ReRack.</h1>
          <p className="intro-copy">Start a wardrobe that works a little harder.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="auth-form" action={signUp}>
          <div className="field"><label htmlFor="real_name">Real name</label><input id="real_name" name="real_name" autoComplete="name" required maxLength={100} /></div>
          <div className="field"><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" aria-describedby="username-hint" /><p className="form-hint" id="username-hint">3–24 letters, numbers or underscores.</p></div>
          <div className="field"><label htmlFor="email">Email address <span className="form-hint">optional</span></label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} /></div>
          <div className="field"><label htmlFor="phone_number">Phone number <span className="form-hint">optional</span></label><input id="phone_number" name="phone_number" type="tel" autoComplete="tel" placeholder="+14155550123" pattern="\+[1-9][0-9]{7,14}" aria-describedby="phone-hint" /><p className="form-hint" id="phone-hint">Add an email address or an international phone number.</p></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
          <button className="button button-dark" type="submit">Create account</button>
        </form>
        <p className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </AppPage>
  );
}
