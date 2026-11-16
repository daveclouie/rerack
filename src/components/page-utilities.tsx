"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const destinations = [
  { href: "/dashboard", title: "Dashboard", description: "Outfits and wardrobe overview" },
  { href: "/closet", title: "Closet archive", description: "Search and manage closet items" },
  { href: "/closet/add", title: "Add closet item", description: "Capture or upload clothing" },
  { href: "/shop", title: "Built-in shop", description: "Browse clothing listings" },
  { href: "/profile", title: "Profile settings", description: "Edit profile details" },
  { href: "/settings", title: "Settings", description: "Preferences and account security" },
];

export function PageUtilities() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scroll, setScroll] = useState(0);

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return destinations.filter((destination) => !search || `${destination.title} ${destination.description}`.toLowerCase().includes(search));
  }, [query]);

  useEffect(() => {
    const updateScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setScroll(available > 0 ? (window.scrollY / available) * 100 : 0);
    };
    const openSearch = () => {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    window.addEventListener("rerack-open-search", openSearch);
    updateScroll();
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      window.removeEventListener("rerack-open-search", openSearch);
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!dialogRef.current?.open) dialogRef.current?.showModal();
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <div className="scroll-progress-track" aria-hidden="true"><span style={{ width: `${scroll}%` }} /></div>
      {scroll > 15 && <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: document.documentElement.dataset.motion === "reduced" ? "instant" : "smooth" })}>Back to top ↑</button>}
      <dialog className="search-dialog" ref={dialogRef} onClose={() => setQuery("")}>
        <div className="search-dialog-heading"><label htmlFor="global-search">Search pages</label><button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()}>Close</button></div>
        <input ref={inputRef} id="global-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and actions" />
        <nav className="search-results" aria-label="Search results">
          {matches.map((destination) => (
            <Link href={destination.href} key={destination.href} onClick={() => dialogRef.current?.close()}>
              <strong>{destination.title}</strong><span>{destination.description}</span>
            </Link>
          ))}
          {!matches.length && <p className="form-hint">No matching pages.</p>}
        </nav>
      </dialog>
    </>
  );
}
