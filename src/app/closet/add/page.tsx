import Link from "next/link";
import { addClosetItem } from "@/app/actions/closet";
import { AppPage } from "@/components/app-page";
import { SubmitButton } from "@/components/submit-button";

export default async function AddClosetItemPage({ searchParams }: PageProps<"/closet/add">) {
  const { error } = await searchParams;
  return (
    <AppPage>
      <section className="auth-wrap">
        <Link className="back-link" href="/dashboard">← Back to dashboard</Link>
        <div className="auth-intro">
          <p className="eyebrow">ADD TO THE ARCHIVE</p>
          <h1>One good photo.</h1>
          <p className="intro-copy">Take a photo or choose one from your device. ReRack removes the background and reads the item details.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="auth-form" action={addClosetItem}>
          <div className="field">
            <label htmlFor="image">Clothing photo</label>
            <input id="image" name="image" type="file" accept="image/*" capture="environment" required />
            <p className="form-hint">JPEG, PNG, WebP or HEIC, up to 10 MB. Camera capture and file selection are both supported.</p>
          </div>
          <SubmitButton className="button button-dark" pendingLabel="Removing background &amp; identifying…">Normalize &amp; add item</SubmitButton>
        </form>
      </section>
    </AppPage>
  );
}
