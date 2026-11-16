"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { wearOutfit } from "@/app/actions/closet";
import { generateOutfit, slotForCategory, type OutfitAssignments, type OutfitItem, type OutfitSlot, type OutfitVibeFilter } from "@/lib/outfits/generator";

type ClosetPiece = OutfitItem & {
  ai_description: string | null;
  imageSrc: string | null;
};

const slotOrder: OutfitSlot[] = ["top", "bottom", "outerwear", "footwear"];
const slotLabels: Record<OutfitSlot, string> = {
  top: "Top",
  bottom: "Bottom",
  outerwear: "Outerwear",
  footwear: "Footwear",
};
const vibeOptions: Array<{ value: OutfitVibeFilter; label: string }> = [
  { value: "all", label: "All vibes" },
  { value: "casual", label: "Casual" },
  { value: "streetwear", label: "Streetwear" },
  { value: "smart/formal", label: "Smart / Formal" },
  { value: "lounge/home", label: "Lounge / Home" },
];

function blankAssignments(): OutfitAssignments {
  return { top: null, bottom: null, outerwear: null, footwear: null };
}

export function OutfitBuilder({ items, anchorId, message }: { items: ClosetPiece[]; anchorId?: string; message?: string }) {
  const anchor = anchorId ? items.find((item) => item.id === anchorId) : undefined;
  const anchorSlot = anchor ? slotForCategory(anchor.category) : null;
  const [vibe, setVibe] = useState<OutfitVibeFilter>("all");
  const [assignments, setAssignments] = useState<OutfitAssignments>(() => {
    const initial = blankAssignments();
    if (anchor && anchorSlot) initial[anchorSlot] = anchor.id;
    return initial;
  });
  const [locked, setLocked] = useState<Record<OutfitSlot, boolean>>(() => ({
    top: anchorSlot === "top",
    bottom: anchorSlot === "bottom",
    outerwear: anchorSlot === "outerwear",
    footwear: anchorSlot === "footwear",
  }));
  const [picker, setPicker] = useState<OutfitSlot | null>(null);
  const [notice, setNotice] = useState("");
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selectedIds = slotOrder.map((slot) => assignments[slot]).filter((id): id is string => Boolean(id));
  const pickerItems = picker ? items.filter((candidate) => (
    slotForCategory(candidate.category) === picker
    && (vibe === "all" || candidate.vibe_tag === vibe)
    && !slotOrder.some((other) => other !== picker && assignments[other] === candidate.id)
  )) : [];

  function generate() {
    const lockedAssignments: Partial<OutfitAssignments> = {};
    for (const slot of slotOrder) {
      if (locked[slot] && assignments[slot]) lockedAssignments[slot] = assignments[slot];
    }
    const next = generateOutfit(items, lockedAssignments, vibe, Math.random, assignments);
    setAssignments(next);
    setPicker(null);
    const requiredSlots = ["top", "bottom", "footwear"] as const;
    const missing = requiredSlots.filter((slot) => !next[slot]);
    setNotice(missing.length ? `Add clean ${missing.map((slot) => slotLabels[slot].toLowerCase()).join(", ")} pieces to complete the outfit.` : "");
  }

  function selectItem(slot: OutfitSlot, id: string) {
    setAssignments((current) => ({ ...current, [slot]: id }));
    setLocked((current) => ({ ...current, [slot]: true }));
    setPicker(null);
    setNotice("");
  }

  const colorNote = "New pieces pair neutrals freely, keep warm and earth tones together, and avoid warm / cool clashes.";

  return (
    <section className="outfit-panel" aria-labelledby="outfit-title">
      <div className="outfit-heading">
        <div>
          <p className="eyebrow">THE DAILY EDIT</p>
          <h2 id="outfit-title">Build an outfit</h2>
        </div>
        <label className="vibe-select">
          <span>Vibe</span>
          <select value={vibe} onChange={(event) => setVibe(event.target.value as OutfitVibeFilter)}>
            {vibeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {message && <p className="setup-notice" role="status">{message}</p>}
      {anchorId && !anchor && <p className="setup-notice">That anchor is not in your clean closet. Choose a piece below to begin.</p>}

      {items.length === 0 ? (
        <div className="outfit-empty">
          <p>No clean pieces to style yet.</p>
          <Link className="text-link" href="/closet/add">Add items to your closet <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <>
          <div className="outfit-slots">
            {slotOrder.map((slot) => {
              const item = assignments[slot] ? itemById.get(assignments[slot]!) : undefined;
              return (
                <article className={`outfit-slot${item ? " has-piece" : ""}`} key={slot}>
                  <div className="slot-meta">
                    <span className="eyebrow">{slotLabels[slot]}</span>
                    <button
                      className="slot-lock"
                      type="button"
                      aria-pressed={locked[slot]}
                      disabled={!item}
                      onClick={() => setLocked((current) => ({ ...current, [slot]: !current[slot] }))}
                    >
                      {locked[slot] ? "Unlock" : "Lock"}
                    </button>
                  </div>
                  <button className="slot-piece" type="button" onClick={() => setPicker(picker === slot ? null : slot)} aria-label={`Choose a ${slotLabels[slot].toLowerCase()}`}>
                    <span className="slot-image">
                      {item?.imageSrc ? <Image src={item.imageSrc} alt="" fill sizes="(max-width: 760px) 42vw, 180px" unoptimized /> : <span className="slot-placeholder">+</span>}
                    </span>
                    <span className="slot-title">{item ? item.category : `Choose ${slotLabels[slot].toLowerCase()}`}</span>
                    {item && <span className="slot-color">{item.dominant_color || item.color_family || "Color not set"}</span>}
                  </button>
                  {picker === slot && (
                    <div className="slot-picker" role="group" aria-label={`Choose ${slotLabels[slot].toLowerCase()}`}>
                      {pickerItems.length === 0 && <p className="picker-empty">No clean {vibe === "all" ? "" : `${vibeOptions.find((option) => option.value === vibe)?.label.toLowerCase()} `}{slotLabels[slot].toLowerCase()} pieces available.</p>}
                      {pickerItems.map((candidate) => (
                        <button className="picker-option" key={candidate.id} type="button" onClick={() => selectItem(slot, candidate.id)}>
                          <span>{candidate.category}</span><span>{candidate.dominant_color || candidate.color_family || "Color not set"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="outfit-footer">
            <p className="form-hint">{colorNote}</p>
            <div className="page-actions">
              <button className="button button-dark" type="button" onClick={generate}>Generate Daily Outfit</button>
              <form action={wearOutfit}>
                {selectedIds.map((id) => <input type="hidden" name="item_id" value={id} key={id} />)}
                <button className="button button-quiet" type="submit" disabled={selectedIds.length === 0}>Wear This Today</button>
              </form>
            </div>
          </div>
          {notice && <p className="form-hint" role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
