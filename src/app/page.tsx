import Link from "next/link";
import Image from "next/image";
import { AppPage } from "@/components/app-page";
import { InstallAppButton } from "@/components/install-app-button";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { message } = await searchParams;
  return (
    <AppPage>
      {message && <p className="setup-notice" role="status">{message}</p>}
      <section className="landing-hero">
        <Image className="landing-mark" src="/rerack-mark.png" alt="" width={76} height={76} priority />
        <p className="eyebrow">A MORE CONSIDERED CLOSET</p>
        <h1>Wear what you own.<br />Pass on what you don&apos;t.</h1>
        <p className="intro-copy">A quieter way to keep your wardrobe in rotation: organize your pieces, build outfits, and make room for a second life.</p>
        <div className="page-actions">
          <Link className="button button-dark" href="/signup">Create your account</Link>
          <Link className="button button-quiet" href="/login">Log in</Link>
          <InstallAppButton />
        </div>
      </section>
      <section className="landing-notes" aria-label="ReRack features">
        <article><span className="eyebrow">01 / KEEP</span><h2>A closet that makes sense.</h2><p>Keep item details, wear history, and laundry status in one useful archive.</p></article>
        <article><span className="eyebrow">02 / WEAR</span><h2>Start with what you have.</h2><p>Build a daily outfit from clean pieces that work together.</p></article>
        <article><span className="eyebrow">03 / RECIRCULATE</span><h2>Let good pieces move on.</h2><p>Prepare items to list when your separate shop is ready.</p></article>
      </section>
      <footer className="landing-footer"><span>ReRack</span><span>Wardrobe, in circulation.</span></footer>
    </AppPage>
  );
}
