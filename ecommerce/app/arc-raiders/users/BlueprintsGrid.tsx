"use client";

import type { Blueprint, CollectionCategory, UserBlueprint } from "@/app/types";
import {
  categoryOf,
  COLLECTION_COLUMNS,
  COLLECTION_TILE_SIZE,
  COLLECTION_TABS,
  collectionGridWidth,
} from "@/app/types";
import type { User } from "@/app/components/UserProvider";
import { BlueprintComponent } from "@/app/components/Blueprint";
import { useUser } from "@/app/components/UserProvider";
import { useClearAll } from "@/app/hooks/useClearAll";
import { useFoundBlueprint } from "@/app/hooks/useFoundBlueprint";
import { useUpload } from "@/app/hooks/useUpload";
import { Tooltip } from "@/app/components/Tooltip";
import { useEffect, useMemo, useState } from "react";

type BlueprintsGridProps = {
  selectedUser: User | null;
  blueprints: Blueprint[];
  userBlueprints: Record<string, UserBlueprint>;
  blueprintsOrder: string[];
};

export default function BlueprintsGrid({
  selectedUser,
  blueprints,
  userBlueprints,
  blueprintsOrder,
}: BlueprintsGridProps) {
  const { user } = useUser();

  const initialFoundBlueprintsCount = useMemo(() => {
    return Object.values(userBlueprints).filter((bp) => bp.isFound).length;
  }, [userBlueprints]);

  const [, setFoundBlueprintsCount] = useState<number>(
    initialFoundBlueprintsCount
  );
  const [tab, setTab] = useState<CollectionCategory>("blueprints");

  const [userBlueprintsState, setUserBlueprintsState] =
    useState<Record<string, UserBlueprint>>(userBlueprints);

  const tabBlueprints = useMemo(() => {
    return blueprintsOrder
      .map((id) => blueprints.find((blueprint) => blueprint.id === id))
      .filter(
        (blueprint): blueprint is Blueprint =>
          !!blueprint && categoryOf(blueprint) === tab
      );
  }, [blueprints, blueprintsOrder, tab]);

  const foundInTab = tabBlueprints.filter(
    (blueprint) => userBlueprintsState[blueprint.id]?.isFound
  ).length;

  useEffect(() => {
    setUserBlueprintsState(userBlueprints);
    setFoundBlueprintsCount(initialFoundBlueprintsCount);
  }, [userBlueprints]);

  const { handleClearAll, modalJsx } = useClearAll({
    userId: user?.userId,
    userBlueprintsState,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  const { handleUpload, isProcessing, fileInputRef } = useUpload({
    user: selectedUser,
    userBlueprintsState,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  const { handleFoundBlueprint } = useFoundBlueprint({
    userId: user?.isAdmin ? selectedUser?.userId : undefined,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  return (
    <div className="h-full bg-black p-8 overflow-hidden flex flex-col">
      <div className="mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">
            BLUEPRINTS
          </h1>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {COLLECTION_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`px-3 py-1 rounded-full text-sm uppercase ${
                    tab === item.id
                      ? "bg-white text-black"
                      : "text-white border border-white/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-white uppercase text-sm">
              FOUND: {foundInTab}/{tabBlueprints.length}
            </p>
            {user?.isAdmin ? (
              <div className="flex items-center gap-2">
                <Tooltip text="Take a screenshot of your blueprints in a game and upload it. Even Ctrl+V will work.">
                  <div className="bg-white text-black rounded-md hover:bg-gray-200 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="blueprint-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="blueprint-upload"
                      className={`cursor-pointer block px-4 py-2 ${isProcessing ? "opacity-50" : ""}`}
                    >
                      {isProcessing ? "Processing..." : "Upload Screenshot"}
                    </label>
                  </div>
                </Tooltip>
                <button
                  onClick={() => handleClearAll()}
                  className="text-white hover:text-gray-400 transition-colors cursor-pointer border border-white rounded-md px-4 py-2"
                >
                  Clear blueprints
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Grid Container */}
        <div className="overflow-auto flex-1 min-h-0">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${COLLECTION_COLUMNS[tab]}, ${COLLECTION_TILE_SIZE})`,
              width: collectionGridWidth(COLLECTION_COLUMNS[tab]),
            }}
          >
            {tabBlueprints.map((blueprint) => {
              const isFound =
                userBlueprintsState[blueprint.id]?.isFound || false;

              const isFavorite =
                userBlueprintsState[blueprint.id]?.isFavorite || false;

              const extraCount =
                userBlueprintsState[blueprint.id]?.extraCount || 0;

              return (
                <BlueprintComponent
                  key={blueprint.id}
                  blueprint={blueprint}
                  isFound={isFound}
                  isFavorite={isFavorite}
                  extraCount={extraCount}
                  isDraggable={false}
                  handleFoundBlueprint={handleFoundBlueprint}
                />
              );
            })}
          </div>
        </div>
      </div>

      {modalJsx}
    </div>
  );
}
