"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { ClothingCategory } from "@/lib/supabase/database.types";

export type ShopItem = {
  id: string;
  item_id: string;
  seller_id: string;
  seller_username: string;
  category: ClothingCategory;
  image_url: string | null;
  imageSrc: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  length: number | null;
  width: number | null;
  price: number;
  description: string;
  issues: string | null;
};

const categories: Array<{ value: ClothingCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "shorts", label: "Shorts" },
  { value: "pants", label: "Pants" },
  { value: "joggers", label: "Joggers" },
  { value: "longsleeves", label: "Longsleeves" },
  { value: "t-shirts", label: "T-shirts" },
  { value: "outerwear", label: "Outerwear" },
  { value: "footwear", label: "Footwear" },
];

export function ShopExplorer({ items }: { items: ShopItem[] }) {
  const [category, setCategory] = useState<ClothingCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => (
      (category === "all" || item.category === category)
      && (!query || `${item.category} ${item.seller_username} ${item.description}`.toLowerCase().includes(query))
    ));
  }, [category, items, search]);

  function openListing(item: ShopItem) {
    setSelected(item);
    dialogRef.current?.showModal();
  }

  function closeListing() {
    dialogRef.current?.close();
    setSelected(null);
  }

  return (
    <section className="shop-explorer">
      <div className="shop-toolbar">
        <div className="filter-tabs shop-categories" role="group" aria-label="Filter by category">
          {categories.map((option) => (
            <button type="button" className={category === option.value ? "filter-tab active" : "filter-tab"} aria-pressed={category === option.value} key={option.value} onClick={() => setCategory(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="shop-search"><span>Search listings</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Description, category or seller" /></label>
      </div>

      {filtered.length ? (
        <div className="shop-grid">
          {filtered.map((item) => (
            <button className="shop-card" key={item.id} type="button" onClick={() => openListing(item)} aria-label={`View ${item.category} listing by @${item.seller_username}`}>
              <span className="shop-card-image">
                {item.imageSrc ? <Image src={item.imageSrc} alt="" fill sizes="(max-width: 600px) 48vw, (max-width: 1000px) 32vw, 240px" unoptimized /> : <span className="image-missing">Photo unavailable</span>}
              </span>
              <span className="shop-card-seller">@{item.seller_username}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="archive-empty"><p className="eyebrow">{items.length ? "NO MATCHES" : "THE SHOP"}</p><h2>{items.length ? "Nothing in this search." : "No listings just yet."}</h2><p>{items.length ? "Try another category or search term." : "Community listings will appear here as pieces find their next home."}</p></div>
      )}

      <dialog className="shop-dialog" ref={dialogRef} onClose={() => setSelected(null)}>
        {selected && (
          <div className="shop-detail">
            <div className="dialog-heading"><div><p className="eyebrow">@{selected.seller_username}</p><h2>{selected.category}</h2></div><button className="dialog-close" type="button" onClick={closeListing}>Close</button></div>
            <div className="shop-detail-grid">
              <div className="shop-detail-image">{selected.imageSrc && <Image src={selected.imageSrc} alt={`${selected.category} listed by @${selected.seller_username}`} fill sizes="(max-width: 760px) 90vw, 440px" unoptimized />}</div>
              <div className="shop-detail-copy">
                <p className="shop-price">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selected.price)}</p>
                <div className="content-row"><span className="content-label">Description</span><span className="content-value">{selected.description}</span></div>
                <div className="content-row"><span className="content-label">Length</span><span className="content-value">{selected.length === null ? "Not provided" : `${selected.length} cm`}</span></div>
                <div className="content-row"><span className="content-label">Width</span><span className="content-value">{selected.width === null ? "Not provided" : `${selected.width} cm`}</span></div>
                <div className="content-row"><span className="content-label">Issues / flaws</span><span className="content-value">{selected.issues || "None noted"}</span></div>
                <div className="shop-contact">
                  <p className="eyebrow">CONTACT SELLER</p>
                  {selected.contact_email && <a className="text-link" href={`mailto:${selected.contact_email}`}>{selected.contact_email}</a>}
                  {selected.contact_phone && <a className="text-link" href={`tel:${selected.contact_phone}`}>{selected.contact_phone}</a>}
                  {!selected.contact_email && !selected.contact_phone && <p className="form-hint">The seller has not shared contact details.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
