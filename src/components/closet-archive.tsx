"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { createShopListing, deleteClosetItem, toggleLaundry } from "@/app/actions/closet";
import type { ColorFamily, OutfitVibe } from "@/lib/supabase/database.types";

export type ArchiveItem = {
  id: string;
  category: string;
  dominant_color: string | null;
  color_family: ColorFamily | null;
  vibe_tag: OutfitVibe | null;
  ai_description: string | null;
  image_url: string | null;
  imageSrc: string | null;
  status: "clean" | "laundry";
  wear_count: number;
  last_worn_date: string | null;
  created_at: string;
  isListed: boolean;
};

const categories = ["All", "shorts", "pants", "joggers", "longsleeves", "t-shirts", "outerwear", "footwear"];

function label(value: string) {
  return value === "longsleeves" ? "Longsleeves" : value === "t-shirts" ? "T-shirts" : value.charAt(0).toUpperCase() + value.slice(1);
}

function isDustCollector(lastWornDate: string | null) {
  if (!lastWornDate) return false;
  const lastWorn = new Date(`${lastWornDate}T00:00:00Z`).getTime();
  const now = new Date();
  const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 60);
  return Number.isFinite(lastWorn) && lastWorn < cutoff;
}

export function ClosetArchive({ items }: { items: ArchiveItem[] }) {
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<"all" | "clean" | "laundry">("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => (
      (category === "All" || item.category === category)
      && (status === "all" || item.status === status)
      && (!query || `${item.category} ${item.dominant_color ?? ""} ${item.color_family ?? ""} ${item.vibe_tag ?? ""} ${item.ai_description ?? ""}`.toLowerCase().includes(query))
    ));
  }, [category, items, search, status]);

  return (
    <section className="archive">
      <div className="archive-controls">
        <div className="filter-tabs" role="group" aria-label="Filter by category">
          {categories.map((option) => (
            <button type="button" className={category === option ? "filter-tab active" : "filter-tab"} aria-pressed={category === option} key={option} onClick={() => setCategory(option)}>
              {option === "All" ? option : label(option)}
            </button>
          ))}
        </div>
        <div className="archive-search">
          <label htmlFor="archive-search">Search archive</label>
          <input id="archive-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Color, vibe or description" />
          <label className="status-filter" htmlFor="archive-status">Status</label>
          <select id="archive-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">All</option><option value="clean">Clean</option><option value="laundry">Laundry</option>
          </select>
        </div>
      </div>

      {filtered.length ? (
        <div className="closet-grid">
          {filtered.map((item) => <ClosetCard item={item} key={item.id} />)}
        </div>
      ) : (
        <div className="archive-empty"><p className="eyebrow">NO MATCHES</p><h2>{items.length ? "Nothing in this view." : "Your archive starts here."}</h2><p>{items.length ? "Try another filter or search term." : "Add a clear photo to keep your pieces in circulation."}</p>{!items.length && <Link className="text-link" href="/closet/add">Add the first item <span aria-hidden="true">→</span></Link>}</div>
      )}
    </section>
  );
}

function ClosetCard({ item }: { item: ArchiveItem }) {
  return (
    <article className={`closet-card${item.status === "laundry" ? " is-laundry" : ""}`}>
      <div className="closet-image">
        {item.imageSrc ? <Image src={item.imageSrc} alt={`${label(item.category)} in ${item.dominant_color ?? "your closet"}`} fill sizes="(max-width: 600px) 48vw, (max-width: 1000px) 32vw, 240px" unoptimized /> : <span className="image-missing">Photo unavailable</span>}
        {item.status === "laundry" && <span className="item-status">Laundry</span>}
        {isDustCollector(item.last_worn_date) && <span className="dust-badge">Dust Collector</span>}
      </div>
      <div className="closet-card-info">
        <div className="closet-card-title"><h2>{label(item.category)}</h2><span>{item.dominant_color || item.color_family || "Color not set"}</span></div>
        <div className="item-tags"><span>{item.vibe_tag ? label(item.vibe_tag) : "Vibe not set"}</span><span>{item.wear_count} wears</span></div>
      </div>
      <div className="closet-card-actions">
        <Link className="text-link" href={`/dashboard?anchor=${encodeURIComponent(item.id)}`}>Build Outfit With This</Link>
        <form action={toggleLaundry}><input type="hidden" name="item_id" value={item.id} /><button className="quiet-action" type="submit">{item.status === "clean" ? "Toggle Laundry" : "Mark Clean"}</button></form>
        {item.isListed ? <span className="listed-label">Listed on shop</span> : <ListingDialog item={item} />}
        <DeleteItemDialog item={item} />
      </div>
    </article>
  );
}

function ListingDialog({ item }: { item: ArchiveItem }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const description = item.ai_description || `${label(item.category)} from my closet`;

  return (
    <>
      <button className="quiet-action" type="button" onClick={() => dialogRef.current?.showModal()}>List on Shop</button>
      <dialog className="listing-dialog" ref={dialogRef}>
        <div className="dialog-heading"><div><p className="eyebrow">RE-RACK A PIECE</p><h2>List on the shop</h2></div><button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close listing form">Close</button></div>
        <div className="listing-preview">
          <div className="listing-preview-image">{item.imageSrc && <Image src={item.imageSrc} alt="" fill sizes="72px" unoptimized />}</div>
          <div><strong>{label(item.category)}</strong><p>{description}</p></div>
        </div>
        <form className="listing-form" action={createShopListing}>
          <input type="hidden" name="item_id" value={item.id} />
          <div className="field"><label htmlFor={`listing-description-${item.id}`}>Description</label><textarea id={`listing-description-${item.id}`} name="description" defaultValue={description} maxLength={500} required /></div>
          <div className="measure-fields">
            <div className="field"><label htmlFor={`listing-length-${item.id}`}>Length (cm)</label><input id={`listing-length-${item.id}`} name="length" type="number" min="0" step="0.1" /></div>
            <div className="field"><label htmlFor={`listing-width-${item.id}`}>Width (cm)</label><input id={`listing-width-${item.id}`} name="width" type="number" min="0" step="0.1" /></div>
            <div className="field"><label htmlFor={`listing-price-${item.id}`}>Price</label><input id={`listing-price-${item.id}`} name="price" type="number" min="0" step="0.01" required /></div>
          </div>
          <div className="field"><label htmlFor={`listing-issues-${item.id}`}>Issues or flaws</label><textarea id={`listing-issues-${item.id}`} name="issues" placeholder="None, or describe visible wear" maxLength={500} /></div>
          <label className="consent-row"><input type="checkbox" name="contact_visible" required /><span>Show my email and/or phone number on this public listing so buyers can contact me directly.</span></label>
          <div className="page-actions"><button className="button button-dark" type="submit">Publish listing</button><button className="button button-quiet" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button></div>
        </form>
      </dialog>
    </>
  );
}

function DeleteItemDialog({ item }: { item: ArchiveItem }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="quiet-action delete-action" type="button" onClick={() => dialogRef.current?.showModal()}>Delete Item</button>
      <dialog className="confirm-dialog" ref={dialogRef}>
        <p className="eyebrow">REMOVE FROM ARCHIVE</p>
        <h2>Delete this {label(item.category)}?</h2>
        <p className="form-hint">The closet photo and any shop listing will also be removed.</p>
        <form className="page-actions" action={deleteClosetItem}>
          <input type="hidden" name="item_id" value={item.id} />
          <button className="button button-dark" type="submit">Delete Item</button>
          <button className="button button-quiet" type="button" onClick={() => dialogRef.current?.close()}>Keep item</button>
        </form>
      </dialog>
    </>
  );
}
