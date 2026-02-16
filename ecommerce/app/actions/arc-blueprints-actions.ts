"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../api/db";
import type { Blueprint, UserBlueprint, UserBlueprints } from "../types";
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

    // Revalidate the pages that display blueprints
    revalidatePath("/admin");
    revalidatePath("/arc-raiders/blueprints");
    revalidatePath("/arc-raiders/users");

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

export async function getBlueprints(): Promise<Blueprint[]> {
  const { db } = await connectToDatabase();

  return await Promise.all([
    db.collection("blueprints").find({}).toArray(),
    getExtraBlueprints(),
  ]).then(([blueprints, extraBlueprints]) => {
    return JSON.parse(JSON.stringify([...blueprints, ...extraBlueprints]));
  });
}

export async function getUsersBlueprints(userId: string) {
  const { db } = await connectToDatabase();
  const counter = await db
    .collection("counters")
    .findOne({ type: "blueprints" });

  const userBlueprints = await db
    .collection<UserBlueprints>("users_blueprints")
    .findOne({ userId });

  // If user blueprints don't exist, create them atomically with upsert
  if (!userBlueprints) {
    const blueprints = await db.collection("blueprints").find({}).toArray();

    const initialBlueprints = blueprints.reduce(
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

    // Use findOneAndUpdate with upsert + $setOnInsert to avoid race condition duplicates
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
          blueprints: { ...userBlueprints.blueprints, ...newBlueprints },
        },
      }
    );

    return {
      blueprints: { ...userBlueprints.blueprints, ...newBlueprints },
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
