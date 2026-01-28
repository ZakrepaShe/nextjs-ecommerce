"use server";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "../api/db";
import type { Blueprint, UserBlueprint, UserBlueprints } from "../types";

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

async function fetchAllBlueprints(): Promise<{
  blueprints: Blueprint[];
  total: number;
}> {
  const allBlueprints: Blueprint[] = [];
  let currentPage = 1;
  let total = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `https://metaforge.app/api/arc-raiders/items?item_type=Blueprint&page=${currentPage}&limit=50`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch blueprints: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();
    allBlueprints.push(...data.data);
    total = data.pagination.total;
    hasNextPage = data.pagination.hasNextPage;
    currentPage++;
  }

  return { blueprints: allBlueprints, total };
}

export async function syncBlueprints() {
  try {
    const { db } = await connectToDatabase();

    // Get current total from counters
    const counter = await db
      .collection("counters")
      .findOne({ type: "blueprints" });
    const currentTotal = counter?.total || 0;

    // Fetch all blueprints from API
    const { blueprints, total } = await fetchAllBlueprints();

    // Check if total has changed
    if (total === currentTotal) {
      return {
        success: true,
        message: "No changes detected. Blueprints are up to date.",
        total,
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

    // Update counters with new total
    await db
      .collection("counters")
      .updateOne(
        { type: "blueprints" },
        { $set: { total, lastSynced: new Date() } },
        { upsert: true }
      );

    return {
      success: true,
      message: `Successfully synced ${syncedCount} blueprints.`,
      total,
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

export async function getBlueprints() {
  const { db } = await connectToDatabase();
  const blueprints = await db.collection("blueprints").find({}).toArray();
  return JSON.parse(JSON.stringify(blueprints));
}

export async function getUsersBlueprints(userId: string) {
  const { db } = await connectToDatabase();
  const counter = await db
    .collection("counters")
    .findOne({ type: "blueprints" });

  const userBlueprints = await db
    .collection<UserBlueprints>("users_blueprints")
    .findOne({ userId });

  // If user blueprints don't exist, create them
  if (!userBlueprints) {
    const blueprints = await db.collection("blueprints").find({}).toArray();

    const initialBlueprints = blueprints.reduce(
      (acc, blueprint) => {
        acc[blueprint.id] = {
          id: blueprint.id,
          isFound: false,
          isFavorite: false,
        };
        return acc;
      },
      {} as Record<string, UserBlueprint>
    );

    await db.collection<UserBlueprints>("users_blueprints").insertOne({
      _id: new ObjectId(),
      userId,
      blueprints: initialBlueprints,
    });

    return {
      blueprints: initialBlueprints,
    };
  }

  // If Blueprints count from metaforge has changed, update user blueprints
  if (counter?.total !== Object.keys(userBlueprints.blueprints).length) {
    const blueprints = await db.collection("blueprints").find({}).toArray();

    const newBlueprints = blueprints
      .filter((blueprint) => !userBlueprints.blueprints[blueprint.id])
      .reduce(
        (acc, blueprint) => {
          acc[blueprint.id] = {
            id: blueprint.id,
            isFound: false,
            isFavorite: false,
          };
          return acc;
        },
        {} as Record<string, UserBlueprint>
      );

    await db.collection<UserBlueprints>("users_blueprints").updateOne(
      { userId },
      {
        $set: {
          blueprints: { ...userBlueprints.blueprints, ...newBlueprints },
        },
      }
    );

    return {
      blueprints: newBlueprints,
    };
  }

  return {
    blueprints: userBlueprints.blueprints,
  };
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
    },
    { upsert: true }
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
}
