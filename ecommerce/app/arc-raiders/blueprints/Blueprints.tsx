"use client";

import { updateUserBlueprintFound } from "@/app/actions/arc-blueprints-actions";
import { useUser } from "@/app/components/UserProvider";
import type { Blueprint, UserBlueprint } from "@/app/types";
import { useState, useMemo } from "react";
import { BlueprintComponent } from "../../components/Blueprint";

type BlueprintsProps = {
  blueprints: Blueprint[];
  userBlueprints: Record<string, UserBlueprint>;
  blueprintsOrder: string[];
};

export default function Blueprints({ blueprints, userBlueprints, blueprintsOrder }: BlueprintsProps) {
  const { user, isLoading } = useUser();

  const [userBlueprintsState, setUserBlueprintsState] = useState<Record<string, UserBlueprint>>(userBlueprints);

  // Convert userBlueprints to a Set of found blueprint IDs
  const initialFoundBlueprintsCount = useMemo(() => {
    return Object.values(userBlueprints)
      .filter((bp) => bp.isFound).length;
  }, [userBlueprints]);

  const [foundBlueprintsCount, setFoundBlueprintsCount] = useState<number>(initialFoundBlueprintsCount);

  const totalCount = blueprints.length;


  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!user) {
    return <div>Not logged in</div>;
  }

  const handleFoundBlueprint = (blueprintId: string) => {
    setFoundBlueprintsCount((prev) => prev + 1);
    updateUserBlueprintFound(user?.userId, blueprintId, true);
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        isFound: true,
      },
    }));
  };

  const handleUnfoundBlueprint = (blueprintId: string) => {
    setFoundBlueprintsCount((prev) => prev - 1);
    updateUserBlueprintFound(user?.userId, blueprintId, false);
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        isFound: false,
      },
    }));
  };

  return (
    <div className="max-h-[calc(100vh-48px)] bg-black p-8">
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">BLUEPRINTS</h1>
          <p className="text-white uppercase text-sm">FOUND: {foundBlueprintsCount}/{totalCount}</p>
        </div>

        {/* Grid Container */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          <div className="grid grid-cols-10 gap-2">
            {blueprintsOrder.map((blueprintId) => {
              const blueprint = blueprints.find((blueprint) => blueprint.id === blueprintId);
              if (!blueprint) {
                return null;
              }
              const isFound = userBlueprintsState[blueprint.id]?.isFound || false;

              return <BlueprintComponent
                key={blueprint.id}
                blueprint={blueprint}
                isFound={isFound}
                handleUnfoundBlueprint={handleUnfoundBlueprint}
                handleFoundBlueprint={handleFoundBlueprint}
              />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}