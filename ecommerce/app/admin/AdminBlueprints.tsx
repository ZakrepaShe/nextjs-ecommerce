"use client";

import {
  addExtraBlueprint,
  syncBlueprints,
  updateBlueprintsOrder,
} from "../actions/arc-blueprints-actions";
import { useUser } from "../components/UserProvider";
import type { Blueprint } from "../types";
import { BlueprintComponent } from "../components/Blueprint";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { toast } from "react-hot-toast";

type AdminBlueprintsProps = {
  blueprintsOrder: string[];
  blueprints: Blueprint[];
};

export default function AdminBlueprints({
  blueprintsOrder,
  blueprints,
}: AdminBlueprintsProps) {
  const { user } = useUser();
  const handleAddExtraBlueprint = async () => {
    const { success, message } = await addExtraBlueprint();
    if (success) {
      toast.success(message || "Success!");
    }
  };
  const handleSyncBlueprints = async () => {
    const result = await syncBlueprints();
    console.log(result);
  };

  const [blueprintsOrderState, setBlueprintsOrderState] =
    useState<string[]>(blueprintsOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blueprintsOrderState.indexOf(active.id as string);
      const newIndex = blueprintsOrderState.indexOf(over.id as string);

      const nextState = arrayMove(blueprintsOrderState, oldIndex, newIndex);
      setBlueprintsOrderState(nextState);
      updateBlueprintsOrder(nextState);
    }
  };

  return (
    <div className="max-h-[calc(100vh-48px)] bg-black p-8">
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-4">Admin</h1>
        {!user?.isAdmin ? (
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              You are not authorized to access this page
            </p>
          </div>
        ) : (
          <div className="text-center mb-4">
            <button
              onClick={handleSyncBlueprints}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Sync Blueprints
            </button>
            <button
              onClick={handleAddExtraBlueprint}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Add Extra Blueprint
            </button>
          </div>
        )}

        {/* Grid Container */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blueprintsOrderState}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-10 gap-2">
                {blueprintsOrderState.map((blueprintId) => {
                  const blueprint = blueprints.find(
                    (bp) => bp.id === blueprintId
                  );
                  if (!blueprint) {
                    console.log("Blueprint not found:", blueprintId);
                    return null;
                  }
                  return (
                    <SortableItem key={blueprint.id} id={blueprint.id}>
                      <BlueprintComponent
                        blueprint={blueprint}
                        isFound={false}
                        isFavorite={false}
                        handleUnfoundBlueprint={() => {}}
                        handleFoundBlueprint={() => {}}
                        handleFavoriteBlueprint={() => {}}
                        handleUnfavoriteBlueprint={() => {}}
                        isDraggable={true}
                      />
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
