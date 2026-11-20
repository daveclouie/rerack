import Link from "next/link";
import { AppPage } from "@/components/app-page";
import { ClosetImageUploadForm } from "@/components/closet-image-upload-form";

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
        <ClosetImageUploadForm />
      </section>
    </AppPage>
  );
}
