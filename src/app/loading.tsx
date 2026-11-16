import { AppPage } from "@/components/app-page";

export default function Loading() {
  return (
    <AppPage>
      <section className="loading-state" role="status" aria-busy="true" aria-label="Loading page">
        <span className="loading-line loading-eyebrow" />
        <span className="loading-line loading-title" />
        <span className="loading-line loading-copy" />
        <div className="loading-grid"><span /><span /><span /><span /></div>
      </section>
    </AppPage>
  );
}
