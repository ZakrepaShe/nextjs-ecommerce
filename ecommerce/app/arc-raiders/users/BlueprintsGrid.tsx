"use client";

import type { Blueprint, UserBlueprint } from "@/app/types";
import { BlueprintComponent } from "@/app/components/Blueprint";

type BlueprintsGridProps = {
  blueprints: Blueprint[];
  userBlueprints: Record<string, UserBlueprint>;
  blueprintsOrder: string[];
};

export default function BlueprintsGrid({
  blueprints,
  userBlueprints,
  blueprintsOrder,
}: BlueprintsGridProps) {
  // Calculate found blueprints count
  const foundBlueprintsCount = Object.values(userBlueprints).filter(
    (bp) => bp.isFound
  ).length;
  const totalCount = blueprints.length;

  return (
    <div className="h-full bg-black p-8 overflow-hidden flex flex-col">
      <div className="max-w-[1040px] mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">
            BLUEPRINTS
          </h1>
          <p className="text-white uppercase text-sm">
            FOUND: {foundBlueprintsCount}/{totalCount}
          </p>
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
                userBlueprints[blueprint.id]?.isFound || false;

              const isFavorite =
                userBlueprints[blueprint.id]?.isFavorite || false;

              return (
                <BlueprintComponent
                  key={blueprint.id}
                  blueprint={blueprint}
                  isFound={isFound}
                  isFavorite={isFavorite}
                  isDraggable={false}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
