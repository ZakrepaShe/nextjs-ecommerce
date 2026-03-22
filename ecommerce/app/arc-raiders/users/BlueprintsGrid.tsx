"use client";

import type { Blueprint, UserBlueprint } from "@/app/types";
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

  const [foundBlueprintsCount, setFoundBlueprintsCount] = useState<number>(
    initialFoundBlueprintsCount
  );
  const totalCount = blueprints.length;

  const [userBlueprintsState, setUserBlueprintsState] =
    useState<Record<string, UserBlueprint>>(userBlueprints);

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
      <div className="max-w-[1040px] mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">
            BLUEPRINTS
          </h1>
          <div className="flex items-center justify-between gap-2">
            <p className="text-white uppercase text-sm">
              FOUND: {foundBlueprintsCount}/{totalCount}
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
        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          <div className="grid grid-cols-10 gap-2">
            {blueprintsOrder.map((blueprintId) => {
              const blueprint = blueprints.find(
                (blueprint) => blueprint.id === blueprintId
              );
              if (!blueprint) {
                return null;
              }
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
