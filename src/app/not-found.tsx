import Link from "next/link";
import { AppPage } from "@/components/app-page";

export default function NotFound() {
  return (
    <AppPage>
      <section className="not-found-page">
        <p className="eyebrow">404 / NOT FOUND</p>
        <h1>This page isn&apos;t in the archive.</h1>
        <p className="intro-copy">The link may have changed, or the page may no longer be here.</p>
        <div className="page-actions"><Link className="button button-dark" href="/">Go to ReRack home</Link><Link className="button button-quiet" href="/login">Log in</Link></div>
      </section>
    </AppPage>
  );
}
