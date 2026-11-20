"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCleanOutfitItems, wearOutfit } from "@/app/actions/closet";
import { SubmitButton } from "@/components/submit-button";
import { generateOutfit, slotForCategory, type OutfitAssignments, type OutfitItem, type OutfitSlot, type OutfitVibeFilter } from "@/lib/outfits/generator";

type ClosetPiece = OutfitItem & {
  ai_description: string | null;
  imageSrc: string | null;
};

type OutfitStep = "choose" | "pick-item" | "filter" | "outfit" | "finished" | "empty";
type OutfitMode = "preferred" | "surprise" | null;

const slotOrder: OutfitSlot[] = ["top", "bottom", "outerwear", "footwear"];
const slotLabels: Record<OutfitSlot, string> = {
  top: "Top",
  bottom: "Bottom",
  outerwear: "Outerwear",
  footwear: "Footwear",
};
const vibeOptions: Array<{ value: OutfitVibeFilter; label: string }> = [
  { value: "all", label: "Any style" },
  { value: "casual", label: "Casual" },
  { value: "streetwear", label: "Streetwear" },
  { value: "smart/formal", label: "Smart / Formal" },
  { value: "lounge/home", label: "Lounge / Home" },
  { value: "y2k", label: "Y2K" },
  { value: "old money", label: "Old Money" },
  { value: "semi-formal", label: "Semi-formal" },
  { value: "smart casual", label: "Smart Casual" },
  { value: "sporty", label: "Sporty" },
  { value: "preppy", label: "Preppy" },
  { value: "minimalist", label: "Minimalist" },
  { value: "vintage", label: "Vintage" },
];
const requiredSlots: OutfitSlot[] = ["top", "bottom", "footwear"];

function blankAssignments(): OutfitAssignments {
  return { top: null, bottom: null, outerwear: null, footwear: null };
}

function blankLocks(): Record<OutfitSlot, boolean> {
  return { top: false, bottom: false, outerwear: false, footwear: false };
}

function label(value: string) {
  return value.split(/[\s/-]+/).map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "").join(" ");
}

function incompleteNotice(assignments: OutfitAssignments, vibe: OutfitVibeFilter) {
  const missing = requiredSlots.filter((slot) => !assignments[slot]);
  if (!missing.length) return "";
  const style = vibe === "all" ? "" : ` tagged ${vibeOptions.find((option) => option.value === vibe)?.label}`;
  return `Add clean${style} ${missing.map((slot) => slotLabels[slot].toLowerCase()).join(", ")} pieces to complete the outfit.`;
}

function createLockedAssignments(slot: OutfitSlot, itemId: string): OutfitAssignments {
  const assignments = blankAssignments();
  assignments[slot] = itemId;
  return assignments;
}

function lockState(slot: OutfitSlot) {
  return { ...blankLocks(), [slot]: true };
}

export function OutfitBuilder({ anchorId, message }: { anchorId?: string; message?: string }) {
  const [items, setItems] = useState<ClosetPiece[]>([]);
  const [vibe, setVibe] = useState<OutfitVibeFilter>("all");
  const [assignments, setAssignments] = useState<OutfitAssignments>(blankAssignments());
  const [locked, setLocked] = useState<Record<OutfitSlot, boolean>>(blankLocks());
  const [preferredItemId, setPreferredItemId] = useState<string | null>(null);
  const [mode, setMode] = useState<OutfitMode>(null);
  const [step, setStep] = useState<OutfitStep>("choose");
  const [picker, setPicker] = useState<OutfitSlot | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const itemsPromiseRef = useRef<Promise<ClosetPiece[]> | null>(null);
  const anchorStartedRef = useRef(false);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selectedIds = slotOrder.map((slot) => assignments[slot]).filter((id): id is string => Boolean(id));
  const pickerItems = picker ? items.filter((candidate) => (
    slotForCategory(candidate.category) === picker
    && (vibe === "all" || candidate.vibe_tag === vibe)
    && !slotOrder.some((other) => other !== picker && assignments[other] === candidate.id)
  )) : [];
  const pickableItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    return items.filter((item) => (
      !query
      || `${item.category} ${item.dominant_color ?? ""} ${item.ai_description ?? ""}`.toLowerCase().includes(query)
    ));
  }, [items, itemSearch]);

  const loadItems = useCallback(async () => {
    setLoadError("");
    if (itemsPromiseRef.current) return itemsPromiseRef.current;

    setIsLoadingItems(true);
    const request = getCleanOutfitItems();
    itemsPromiseRef.current = request;
    try {
      const loaded = await request;
      setItems(loaded);
      return loaded;
    } catch (error) {
      itemsPromiseRef.current = null;
      console.error("Could not load outfit items.", error);
      setLoadError("Your clean closet could not be loaded. Please try again.");
      return null;
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const selectPreferredItem = useCallback((item: ClosetPiece, sourceItems = items) => {
    const slot = slotForCategory(item.category);
    if (!slot) {
      setNotice("This item cannot be used in an outfit.");
      return;
    }

    const selectedVibe = item.vibe_tag ?? "all";
    const next = generateOutfit(sourceItems, createLockedAssignments(slot, item.id), selectedVibe);
    setVibe(selectedVibe);
    setAssignments(next);
    setLocked(lockState(slot));
    setPreferredItemId(item.id);
    setMode("preferred");
    setStep("outfit");
    setNotice(incompleteNotice(next, selectedVibe));
    setPicker(null);
  }, [items]);

  const openAnchor = useCallback(async () => {
    dialogRef.current?.showModal();
    const loaded = await loadItems();
    if (!loaded) return;
    if (loaded.length === 0) {
      setStep("empty");
      setNotice("");
      return;
    }

    const anchor = loaded.find((item) => item.id === anchorId);
    if (!anchor) {
      setStep("choose");
      setNotice("That piece is not in your clean closet. Choose a clean item or let ReRack surprise you.");
      return;
    }
    selectPreferredItem(anchor, loaded);
  }, [anchorId, loadItems, selectPreferredItem]);

  useEffect(() => {
    if (!anchorId || anchorStartedRef.current) return;
    anchorStartedRef.current = true;
    void openAnchor();
  }, [anchorId, openAnchor]);

  function openGenerator() {
    setStep("choose");
    setMode(null);
    setNotice("");
    setLoadError("");
    setPicker(null);
    dialogRef.current?.showModal();
    void loadItems().then((loaded) => {
      if (loaded?.length === 0) setStep("empty");
    });
  }

  function generateSurpriseOutfit() {
    const next = generateOutfit(items, {}, vibe);
    setAssignments(next);
    setLocked(blankLocks());
    setPreferredItemId(null);
    setMode("surprise");
    setStep("outfit");
    setNotice(incompleteNotice(next, vibe));
    setPicker(null);
  }

  function reroll() {
    const lockedAssignments: Partial<OutfitAssignments> = {};
    for (const slot of slotOrder) {
      if (locked[slot] && assignments[slot]) lockedAssignments[slot] = assignments[slot];
    }
    const next = generateOutfit(items, lockedAssignments, vibe, Math.random, assignments);
    setAssignments(next);
    setPicker(null);
    setNotice(incompleteNotice(next, vibe));
  }

  function selectItem(slot: OutfitSlot, id: string) {
    setAssignments((current) => ({ ...current, [slot]: id }));
    setLocked((current) => ({ ...current, [slot]: true }));
    setPicker(null);
    setNotice("");
  }

  function startOver() {
    setStep("choose");
    setMode(null);
    setAssignments(blankAssignments());
    setLocked(blankLocks());
    setPreferredItemId(null);
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
        <button className="button button-dark" type="button" onClick={openGenerator}>Generate outfit</button>
      </div>

      {message && <p className="setup-notice" role="status">{message}</p>}
      <p className="form-hint">{colorNote}</p>

      <dialog className="outfit-dialog" ref={dialogRef} aria-labelledby="outfit-dialog-title" onClose={() => setPicker(null)}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">A THREE-STEP OUTFIT BUILDER</p>
            <h2 id="outfit-dialog-title">{step === "finished" ? "Outfit ready" : "Build your outfit"}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()}>Close</button>
        </div>

        {isLoadingItems && <p className="form-hint" role="status">Loading your clean closet…</p>}
        {loadError && <div className="outfit-flow-page"><p className="form-error" role="alert">{loadError}</p><button className="button button-quiet" type="button" onClick={() => void loadItems()}>Try again</button></div>}
        {!isLoadingItems && !loadError && step === "empty" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">YOUR CLOSET</p>
            <h3>No clean pieces to style yet.</h3>
            <p className="form-hint">Add or mark an item clean in your closet archive, then come back to build an outfit.</p>
            <div className="page-actions">
              <Link className="button button-dark" href="/closet">Open closet archive</Link>
              <Link className="button button-quiet" href="/closet/add">Add an item</Link>
            </div>
          </div>
        )}
        {!isLoadingItems && !loadError && step === "choose" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">STEP 1 OF 3</p>
            <h3>How would you like to start?</h3>
            <p className="form-hint">Choose a piece to build around, or let ReRack choose a look from your closet.</p>
            <div className="outfit-choice-grid">
              <button className="outfit-choice" type="button" onClick={() => { setMode("preferred"); setStep("pick-item"); }}>
                <strong>Choose a piece</strong><span>Start with something from your closet.</span>
              </button>
              <button className="outfit-choice" type="button" onClick={() => { setMode("surprise"); setStep("filter"); }}>
                <strong>Surprise me</strong><span>Pick a style and get a random outfit.</span>
              </button>
            </div>
          </div>
        )}

        {!isLoadingItems && !loadError && step === "pick-item" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">STEP 1 OF 3 / YOUR PIECE</p>
            <h3>Choose what you want to wear</h3>
            <label className="outfit-item-search">
              <span className="sr-only">Search your closet</span>
              <input type="search" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search your clean closet" />
            </label>
            <div className="outfit-pick-grid">
              {pickableItems.map((item) => (
                <button className="outfit-pick-card" key={item.id} type="button" onClick={() => selectPreferredItem(item)}>
                  <span className="outfit-pick-image">
                    {item.imageSrc ? <Image src={item.imageSrc} alt="" fill sizes="(max-width: 600px) 42vw, 150px" unoptimized /> : <span className="slot-placeholder">+</span>}
                  </span>
                  <span>{label(item.category)}</span>
                  <small>{item.dominant_color || item.color_family || "Color not set"}</small>
                </button>
              ))}
              {pickableItems.length === 0 && <p className="picker-empty">No closet pieces match that search.</p>}
            </div>
            <button className="text-link outfit-back" type="button" onClick={() => { setStep("choose"); setItemSearch(""); }}>Back</button>
          </div>
        )}

        {!isLoadingItems && !loadError && step === "filter" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">STEP 1 OF 3 / SURPRISE ME</p>
            <h3>What kind of outfit are you in the mood for?</h3>
            <label className="vibe-select outfit-style-filter">
              <span>Style</span>
              <select value={vibe} onChange={(event) => setVibe(event.target.value as OutfitVibeFilter)}>
                {vibeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="page-actions">
              <button className="button button-quiet" type="button" onClick={() => setStep("choose")}>Back</button>
              <button className="button button-dark" type="button" onClick={generateSurpriseOutfit}>Generate surprise outfit</button>
            </div>
          </div>
        )}

        {!isLoadingItems && !loadError && step === "outfit" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">STEP 2 OF 3 / MAKE IT YOURS</p>
            <h3>{mode === "preferred" ? "Your piece is locked in" : `${vibeOptions.find((option) => option.value === vibe)?.label} outfit`}</h3>
            <p className="form-hint">{mode === "preferred" ? "Your chosen piece stays put. Reroll the rest until it feels right." : "Lock pieces you like, then reroll the rest."}</p>
            <div className="outfit-slots">
              {slotOrder.map((slot) => {
                const item = assignments[slot] ? itemById.get(assignments[slot]!) : undefined;
                const isPreferred = item?.id === preferredItemId;
                return (
                  <article className={`outfit-slot${item ? " has-piece" : ""}`} key={slot}>
                    <div className="slot-meta">
                      <span className="eyebrow">{slotLabels[slot]}</span>
                      <button
                        className="slot-lock"
                        type="button"
                        aria-pressed={locked[slot]}
                        disabled={!item || isPreferred}
                        onClick={() => setLocked((current) => ({ ...current, [slot]: !current[slot] }))}
                      >
                        {isPreferred ? "Preferred" : locked[slot] ? "Unlock" : "Lock"}
                      </button>
                    </div>
                    <button className="slot-piece" type="button" disabled={isPreferred} onClick={() => setPicker(picker === slot ? null : slot)} aria-label={`Choose a ${slotLabels[slot].toLowerCase()}`}>
                      <span className="slot-image">
                        {item?.imageSrc ? <Image src={item.imageSrc} alt="" fill sizes="(max-width: 760px) 42vw, 180px" unoptimized /> : <span className="slot-placeholder">+</span>}
                      </span>
                      <span className="slot-title">{item ? label(item.category) : `Choose ${slotLabels[slot].toLowerCase()}`}</span>
                      {item && <span className="slot-color">{item.dominant_color || item.color_family || "Color not set"}</span>}
                    </button>
                    {picker === slot && (
                      <div className="slot-picker" role="group" aria-label={`Choose ${slotLabels[slot].toLowerCase()}`}>
                        {pickerItems.length === 0 && <p className="picker-empty">No clean {vibe === "all" ? "" : `${vibeOptions.find((option) => option.value === vibe)?.label.toLowerCase()} `}{slotLabels[slot].toLowerCase()} pieces available.</p>}
                        {pickerItems.map((candidate) => (
                          <button className="picker-option" key={candidate.id} type="button" onClick={() => selectItem(slot, candidate.id)}>
                            <span>{label(candidate.category)}</span><span>{candidate.dominant_color || candidate.color_family || "Color not set"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {notice && <p className="form-hint" role="status">{notice}</p>}
            <p className="form-hint">{colorNote}</p>
            <div className="page-actions">
              <button className="button button-quiet" type="button" onClick={() => setStep(mode === "surprise" ? "filter" : "pick-item")}>Back</button>
              <button className="button button-quiet" type="button" onClick={reroll}>Reroll unlocked pieces</button>
              <button className="button button-dark" type="button" onClick={() => { setStep("finished"); setPicker(null); }}>Finish outfit</button>
            </div>
          </div>
        )}

        {!isLoadingItems && !loadError && step === "finished" && (
          <div className="outfit-flow-page">
            <p className="eyebrow">STEP 3 OF 3 / FINISHED OUTFIT</p>
            <h3>Here is your look</h3>
            <div className="outfit-finished-grid">
              {slotOrder.filter((slot) => assignments[slot]).map((slot) => {
                const item = itemById.get(assignments[slot]!);
                if (!item) return null;
                return (
                  <div className="outfit-finished-item" key={slot}>
                    <span className="outfit-pick-image">
                      {item.imageSrc ? <Image src={item.imageSrc} alt="" fill sizes="(max-width: 600px) 40vw, 140px" unoptimized /> : <span className="slot-placeholder">+</span>}
                    </span>
                    <span className="eyebrow">{slotLabels[slot]}</span>
                    <strong>{label(item.category)}</strong>
                    <span className="form-hint">{item.dominant_color || item.color_family || "Color not set"}</span>
                  </div>
                );
              })}
            </div>
            {notice && <p className="form-hint" role="status">{notice}</p>}
            <div className="page-actions">
              <button className="button button-quiet" type="button" onClick={() => setStep("outfit")}>Back to outfit</button>
              <form action={wearOutfit}>
                {selectedIds.map((id) => <input type="hidden" name="item_id" value={id} key={id} />)}
                <SubmitButton className="button button-dark" pendingLabel="Saving outfit…" disabled={selectedIds.length === 0}>Wear this today</SubmitButton>
              </form>
              <button className="button button-quiet" type="button" onClick={() => { startOver(); dialogRef.current?.close(); }}>Done</button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
