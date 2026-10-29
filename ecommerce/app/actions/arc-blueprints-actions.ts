"use server";

import { revalidatePath } from "next/cache";
import type { Db } from "mongodb";
import { connectToDatabase } from "../api/db";
import type {
  Blueprint,
  CollectionCategory,
  UserBlueprint,
  UserBlueprints,
} from "../types";
import { ExtraActionType } from "../types";
interface ApiResponse {
  data: Blueprint[];
  maxValue: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const COLLECTIONS: { category: CollectionCategory; itemType: string }[] = [
  { category: "blueprints", itemType: "Blueprint" },
  { category: "stencils", itemType: "Stencil" },
  { category: "designs", itemType: "Design" },
];

type CollectionTotals = Record<CollectionCategory, number>;

async function fetchCollection(
  itemType: string
): Promise<{ items: Blueprint[]; total: number }> {
  const items: Blueprint[] = [];
  let currentPage = 1;
  let total = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `https://metaforge.app/api/arc-raiders/items?item_type=${encodeURIComponent(itemType)}&page=${currentPage}&limit=100`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${itemType}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();
    items.push(...data.data);
    total = data.pagination.total;
    hasNextPage = data.pagination.hasNextPage;
    currentPage++;
  }

  return { items, total };
}

async function fetchAllBlueprints(): Promise<{
  blueprints: Blueprint[];
  totals: CollectionTotals;
}> {
  const totals = {} as CollectionTotals;
  const blueprints: Blueprint[] = [];

  for (const collection of COLLECTIONS) {
    const { items, total } = await fetchCollection(collection.itemType);
    totals[collection.category] = total;
    blueprints.push(
      ...items.map((item) => ({ ...item, category: collection.category }))
    );
  }

  return { blueprints, totals };
}

async function syncBlueprintsOrder(
  db: Db,
  apiBlueprintsOrdered: Blueprint[]
): Promise<void> {
  const apiIdsOrdered = apiBlueprintsOrdered.map((b) => b.id);

  const [orderDoc, extrasDoc] = await Promise.all([
    db.collection("blueprints_order").findOne({ type: "blueprints_order" }),
    db.collection("extra_blueprints").findOne({ type: "extra_blueprints" }),
  ]);

  const extraIds =
    (extrasDoc?.blueprints as { id: string }[] | undefined)?.map((b) => b.id) ??
    [];
  const allowed = new Set([...apiIdsOrdered, ...extraIds]);

  const currentOrder = (orderDoc?.blueprints as string[] | undefined) ?? [];

  const mergedSet = new Set<string>();
  const merged: string[] = [];

  const pushUnique = (id: string) => {
    if (!mergedSet.has(id)) {
      mergedSet.add(id);
      merged.push(id);
    }
  };

  for (const id of currentOrder) {
    if (allowed.has(id)) pushUnique(id);
  }
  for (const id of apiIdsOrdered) pushUnique(id);
  for (const id of extraIds) pushUnique(id);

  await db
    .collection("blueprints_order")
    .updateOne(
      { type: "blueprints_order" },
      { $set: { blueprints: merged } },
      { upsert: true }
    );
}

export async function syncBlueprints() {
  try {
    const { db } = await connectToDatabase();

    // Get current total from counters
    const counter = await db
      .collection("counters")
      .findOne({ type: "blueprints" });

    const { blueprints, totals } = await fetchAllBlueprints();
    const previous = counter?.totals as CollectionTotals | undefined;
    const unchanged =
      previous &&
      COLLECTIONS.every(
        (collection) =>
          previous[collection.category] === totals[collection.category]
      );

    if (unchanged) {
      return {
        success: true,
        message: "No changes detected. Collections are up to date.",
        total: blueprints.length,
        synced: 0,
      };
    }

    // Update blueprints in database
    let syncedCount = 0;
    for (const blueprint of blueprints) {
      await db
        .collection("blueprints")
        .updateOne({ id: blueprint.id }, { $set: blueprint }, { upsert: true });
      syncedCount++;
    }

    // Update counters with new total and last synced date
    await db.collection("counters").updateOne(
      { type: "blueprints" },
      {
        $set: {
          totals,
          total: blueprints.length,
          lastSynced: new Date(),
        },
      },
      { upsert: true }
    );

    // Sync blueprints order
    await syncBlueprintsOrder(db, blueprints);

    // Revalidate the pages that display blueprints
    revalidatePath("/admin");
    revalidatePath("/arc-raiders/blueprints");
    revalidatePath("/arc-raiders/users");

    return {
      success: true,
      message: `Successfully synced ${syncedCount} items (${totals.blueprints} blueprints, ${totals.stencils} stencils, ${totals.designs} designs).`,
      total: blueprints.length,
      synced: syncedCount,
    };
  } catch (error) {
    console.error("Error syncing blueprints:", error);
    return {
      success: false,
      message: `Failed to sync blueprints: ${error instanceof Error ? error.message : "Unknown error"}`,
      total: 0,
      synced: 0,
    };
  }
}

export async function getBlueprints(): Promise<Blueprint[]> {
  const { db } = await connectToDatabase();

  return await Promise.all([
    db.collection("blueprints").find({}).toArray(),
    getExtraBlueprints(),
  ]).then(([blueprints, extraBlueprints]) => {
    return JSON.parse(JSON.stringify([...blueprints, ...extraBlueprints]));
  });
}

function blankUserBlueprint(id: string): UserBlueprint {
  return { id, isFound: false, isFavorite: false, extraCount: 0 };
}

export async function getUsersBlueprints(userId: string) {
  const { db } = await connectToDatabase();
  const catalog = await db
    .collection("blueprints")
    .find({}, { projection: { id: 1 } })
    .toArray();
  const catalogIds = catalog.map((blueprint) => blueprint.id as string);

  const userBlueprints = await db
    .collection<UserBlueprints>("users_blueprints")
    .findOne({ userId });

  if (!userBlueprints) {
    const initialBlueprints = catalogIds.reduce(
      (acc, id) => {
        acc[id] = blankUserBlueprint(id);
        return acc;
      },
      {} as Record<string, UserBlueprint>
    );

    await db.collection<UserBlueprints>("users_blueprints").findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          blueprints: initialBlueprints,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return { blueprints: initialBlueprints };
  }

  const missing = catalogIds.filter((id) => !userBlueprints.blueprints[id]);
  if (missing.length === 0) {
    return { blueprints: userBlueprints.blueprints };
  }

  const added = missing.reduce(
    (acc, id) => {
      acc[id] = blankUserBlueprint(id);
      return acc;
    },
    {} as Record<string, UserBlueprint>
  );
  const merged = { ...userBlueprints.blueprints, ...added };

  await db
    .collection<UserBlueprints>("users_blueprints")
    .updateOne({ userId }, { $set: { blueprints: merged } });

  return { blueprints: merged };
}

export async function updateUserBlueprintFound(
  userId: string,
  blueprintId: string,
  isFound: boolean
) {
  const { db } = await connectToDatabase();
  await db.collection<UserBlueprints>("users_blueprints").updateOne(
    { userId },
    {
      $set: {
        [`blueprints.${blueprintId}.isFound`]: isFound,
      },
    }
  );
}

export async function updateUserBlueprintFavorite(
  userId: string,
  blueprintId: string,
  isFavorite: boolean
) {
  const { db } = await connectToDatabase();
  await db
    .collection<UserBlueprints>("users_blueprints")
    .updateOne(
      { userId },
      { $set: { [`blueprints.${blueprintId}.isFavorite`]: isFavorite } }
    );
}

export async function resetUserBlueprints(userId: string) {
  const { db } = await connectToDatabase();
  const blueprints = await db.collection("blueprints").find({}).toArray();

  const resetBlueprints = blueprints.reduce(
    (acc, blueprint) => {
      acc[blueprint.id] = {
        id: blueprint.id,
        isFound: false,
        isFavorite: false,
        extraCount: 0,
      };
      return acc;
    },
    {} as Record<string, UserBlueprint>
  );

  await db.collection<UserBlueprints>("users_blueprints").updateOne(
    { userId },
    {
      $set: {
        blueprints: resetBlueprints,
      },
    }
  );
}

export async function updateUserBlueprintExtra(
  userId: string,
  blueprintId: string,
  action: ExtraActionType
) {
  const { db } = await connectToDatabase();
  const userBlueprints = await db
    .collection<UserBlueprints>("users_blueprints")
    .findOne({ userId });

  if (!userBlueprints) {
    return;
  }

  await db.collection<UserBlueprints>("users_blueprints").updateOne(
    { userId },
    {
      $set: {
        [`blueprints.${blueprintId}.extraCount`]:
          action === ExtraActionType.Increment
            ? userBlueprints.blueprints[blueprintId].extraCount + 1
            : userBlueprints.blueprints[blueprintId].extraCount - 1,
      },
    }
  );
}

export async function getBlueprintsOrder() {
  const { db } = await connectToDatabase();
  const blueprintsOrderRecord = await db
    .collection("blueprints_order")
    .findOne({ type: "blueprints_order" });

  if (!blueprintsOrderRecord) {
    const blueprints = await db.collection("blueprints").find({}).toArray();
    const initialBlueprintsOrder = blueprints.map((blueprint) => blueprint.id);
    await db.collection("blueprints_order").insertOne({
      type: "blueprints_order",
      blueprints: initialBlueprintsOrder,
    });
    return initialBlueprintsOrder;
  }

  return blueprintsOrderRecord.blueprints;
}

export async function updateBlueprintsOrder(blueprintsOrder: string[]) {
  const { db } = await connectToDatabase();
  await db
    .collection("blueprints_order")
    .updateOne(
      { type: "blueprints_order" },
      { $set: { blueprints: blueprintsOrder } }
    );

  // Revalidate the pages that display blueprints
  revalidatePath("/admin");
  revalidatePath("/arc-raiders/blueprints");
  revalidatePath("/arc-raiders/users");
}

export async function getExtraBlueprints() {
  const { db } = await connectToDatabase();
  const extraBlueprints = await db
    .collection("extra_blueprints")
    .findOne({ type: "extra_blueprints" });

  if (!extraBlueprints) {
    return [];
  }
  return extraBlueprints.blueprints;
}

export async function addExtraBlueprint() {
  const { db } = await connectToDatabase();
  const extraBlueprintsRecord = await db
    .collection("extra_blueprints")
    .findOne({ type: "extra_blueprints" });

  if (!extraBlueprintsRecord) {
    await db.collection("extra_blueprints").insertOne({
      type: "extra_blueprints",
      blueprints: [],
    });
  }

  const counter = (extraBlueprintsRecord?.blueprints?.length || 0) + 1;

  await db.collection("extra_blueprints").findOneAndUpdate(
    { type: "extra_blueprints" },
    {
      $set: {
        blueprints: [
          ...(extraBlueprintsRecord?.blueprints || []),
          { id: `extra_${counter}`, icon: "" },
        ],
      },
    }
  );

  const blueprintsOrder = await getBlueprintsOrder();
  const newBlueprintsOrder = [...blueprintsOrder, `extra_${counter}`];

  await updateBlueprintsOrder(newBlueprintsOrder);

  return {
    success: true,
    message: "Extra blueprint added successfully.",
  };
}
