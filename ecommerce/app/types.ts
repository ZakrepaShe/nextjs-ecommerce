import type { ObjectId } from "mongodb";

export type User = {
  _id: ObjectId;
  userId: string;
  name: string;
  isAdmin: boolean;
  password: string;
};

export type FrontendUser = Omit<User, "password" | "_id">;

export type CollectionCategory = "blueprints" | "stencils" | "designs";

export const COLLECTION_TABS: { id: CollectionCategory; label: string }[] = [
  { id: "blueprints", label: "Blueprints" },
  { id: "stencils", label: "Stencils" },
  { id: "designs", label: "Designs" },
];

// Column counts from the in-game collection screens: 17 blueprint tiles,
// 9 stencil cards, 17 design tiles.
export const COLLECTION_COLUMNS: Record<CollectionCategory, number> = {
  blueprints: 17,
  stencils: 9,
  designs: 17,
};

/** Gap on the collection grids (Tailwind `gap-2`). */
const COLLECTION_GAP = "0.5rem";

/**
 * Tile edge sized so 17 columns, the gap, and the page padding (`p-8`)
 * fit in a 1690px-wide window.
 */
export const COLLECTION_TILE_SIZE = `calc((1690px - 4rem - 16 * ${COLLECTION_GAP}) / 17)`;

export function collectionGridWidth(columns: number): string {
  const gaps = Math.max(columns - 1, 0);
  return `calc(${columns} * ${COLLECTION_TILE_SIZE} + ${gaps} * ${COLLECTION_GAP})`;
}

export function categoryOf(blueprint: {
  id: string;
  category?: CollectionCategory;
}): CollectionCategory {
  if (blueprint.id.startsWith("extra_") || !blueprint.category) {
    return "blueprints";
  }
  return blueprint.category;
}

export type Blueprint = {
  id: string;
  name: string;
  description: string;
  item_type: string;
  loadout_slots: unknown[];
  icon: string;
  rarity: string;
  value: number;
  workbench: string | null;
  stat_block: Record<string, unknown>;
  flavor_text: string;
  subcategory: string;
  created_at: string;
  updated_at: string;
  shield_type: string;
  loot_area: string;
  sources: unknown;
  ammo_type: string;
  locations: unknown[];
  guide_links: unknown[];
  game_asset_id: number | null;
  category?: CollectionCategory;
};

export type UserBlueprint = {
  id: string;
  isFound: boolean;
  isFavorite: boolean;
  extraCount: number;
};

export type UserBlueprints = {
  _id: ObjectId;
  userId: string;
  blueprints: Record<string, UserBlueprint>;
};

export enum ExtraActionType {
  Increment = "increment",
  Decrement = "decrement",
}
