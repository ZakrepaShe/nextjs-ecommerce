import type { ObjectId } from "mongodb";

export type User = {
  _id: ObjectId;
  userId: string;
  name: string;
  isAdmin: boolean;
  password: string;
};

export type FrontendUser = Omit<User, "password" | "_id">;

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
};

export type UserBlueprint = {
  id: string;
  isFound: boolean;
  isFavorite: boolean;
};

export type UserBlueprints = {
  _id: ObjectId;
  userId: string;
  blueprints: Record<string, UserBlueprint>;
};
