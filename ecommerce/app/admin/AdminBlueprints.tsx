"use client";

import {
  addExtraBlueprint,
  syncBlueprints,
  updateBlueprintsOrder,
} from "../actions/arc-blueprints-actions";
import { useUser } from "../components/UserProvider";
import type { Blueprint, CollectionCategory } from "../types";
import {
  categoryOf,
  COLLECTION_COLUMNS,
  COLLECTION_TILE_SIZE,
  COLLECTION_TABS,
  collectionGridWidth,
} from "../types";
import { BlueprintComponent } from "../components/Blueprint";
import { useState } from "react";
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
  const [tab, setTab] = useState<CollectionCategory>("blueprints");

  const tabIds = blueprintsOrderState.filter((id) => {
    const blueprint = blueprints.find((item) => item.id === id);
    return blueprint && categoryOf(blueprint) === tab;
  });

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
      const oldIndex = tabIds.indexOf(active.id as string);
      const newIndex = tabIds.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return;

      const nextTab = arrayMove(tabIds, oldIndex, newIndex);
      let cursor = 0;
      const nextState = blueprintsOrderState.map((id) => {
        const blueprint = blueprints.find((item) => item.id === id);
        if (!blueprint || categoryOf(blueprint) !== tab) return id;
        return nextTab[cursor++];
      });
      setBlueprintsOrderState(nextState);
      updateBlueprintsOrder(nextState);
    }
  };

  return (
    <div className="flex h-[calc(100vh-48px)] w-full min-w-0 flex-col overflow-hidden bg-black">
      <div className="shrink-0 px-8 pt-8">
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-4">Admin</h1>
        <div className="flex items-center gap-2 mb-4">
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
        {!user?.isAdmin ? null : (
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
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto px-8 pb-8">
          {user?.isAdmin ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tabIds} strategy={rectSortingStrategy}>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${COLLECTION_COLUMNS[tab]}, ${COLLECTION_TILE_SIZE})`,
                    width: collectionGridWidth(COLLECTION_COLUMNS[tab]),
                  }}
                >
                  {tabIds.map((blueprintId) => {
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
                          isDraggable={true}
                          isHighlighted={false}
                          extraCount={0}
                        />
                      </SortableItem>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center min-h-[calc(100vh-200px)] flex items-center justify-center">
              <p className="text-white mb-2">
                You are not authorized to access this page
              </p>
            </div>
          )}
        </div>
    </div>
  );
}
