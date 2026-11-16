import type { ColorFamily, OutfitVibe } from "@/lib/supabase/database.types";

export type OutfitSlot = "top" | "bottom" | "outerwear" | "footwear";
export type OutfitVibeFilter = "all" | OutfitVibe;

export type OutfitItem = {
  id: string;
  category: string;
  dominant_color: string | null;
  color_family: ColorFamily | null;
  vibe_tag: OutfitVibe | null;
};

export type OutfitAssignments = Record<OutfitSlot, string | null>;

const slotCategories: Record<OutfitSlot, string[]> = {
  top: ["t-shirts", "longsleeves"],
  bottom: ["shorts", "pants", "joggers"],
  outerwear: ["outerwear"],
  footwear: ["footwear"],
};

const slots: OutfitSlot[] = ["top", "bottom", "outerwear", "footwear"];

function isColorHarmonyCompatible(candidate: ColorFamily | null, existing: Array<ColorFamily | null>) {
  if (!candidate || candidate === "neutral") return true;
  return existing.every((family) => (
    !family
    || family === "neutral"
    || family === candidate
    || (candidate === "warm" && family === "earth")
    || (candidate === "earth" && family === "warm")
  ));
}

export function generateOutfit(
  items: OutfitItem[],
  locked: Partial<OutfitAssignments>,
  vibe: OutfitVibeFilter,
  random: () => number = Math.random,
  previous: Partial<OutfitAssignments> = {},
): OutfitAssignments {
  const assignments: OutfitAssignments = { top: null, bottom: null, outerwear: null, footwear: null };
  const itemById = new Map(items.map((item) => [item.id, item]));
  const selectedIds = new Set<string>();

  for (const slot of slots) {
    const itemId = locked[slot];
    if (itemId && itemById.has(itemId)) {
      assignments[slot] = itemId;
      selectedIds.add(itemId);
    }
  }

  for (const slot of slots) {
    if (assignments[slot]) continue;

    const existingFamilies = slots.flatMap((assignedSlot) => {
      const itemId = assignments[assignedSlot];
      return itemId ? [itemById.get(itemId)?.color_family ?? null] : [];
    });
    const candidates = items.filter((item) => (
      slotCategories[slot].includes(item.category)
      && !selectedIds.has(item.id)
      && (vibe === "all" || item.vibe_tag === vibe)
      && isColorHarmonyCompatible(item.color_family, existingFamilies)
    ));

    if (candidates.length === 0) continue;
    const rerollCandidates = candidates.filter((item) => item.id !== previous[slot]);
    const pool = rerollCandidates.length ? rerollCandidates : candidates;
    const index = Math.floor(Math.max(0, Math.min(random(), 1 - Number.EPSILON)) * pool.length);
    const selected = pool[index];
    assignments[slot] = selected.id;
    selectedIds.add(selected.id);
  }

  return assignments;
}

export function slotForCategory(category: string): OutfitSlot | null {
  return slots.find((slot) => slotCategories[slot].includes(category)) ?? null;
}
