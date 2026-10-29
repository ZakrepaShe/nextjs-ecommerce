"use client";

import {
  updateUserBlueprintFavorite,
  updateUserBlueprintExtra,
} from "@/app/actions/arc-blueprints-actions";
import { useUser } from "@/app/components/UserProvider";
import { useClearAll } from "@/app/hooks/useClearAll";
import { useFoundBlueprint } from "@/app/hooks/useFoundBlueprint";
import { useUpload } from "@/app/hooks/useUpload";
import type { Blueprint, CollectionCategory, UserBlueprint } from "@/app/types";
import { categoryOf, COLLECTION_TABS, ExtraActionType } from "@/app/types";
import { useState, useMemo } from "react";
import { BlueprintComponent } from "../../components/Blueprint";
import toast from "react-hot-toast";
import { Tooltip } from "../../components/Tooltip";

type BlueprintsProps = {
  blueprints: Blueprint[];
  userBlueprints: Record<string, UserBlueprint>;
  blueprintsOrder: string[];
};

export default function Blueprints({
  blueprints,
  userBlueprints,
  blueprintsOrder,
}: BlueprintsProps) {
  const { user, isLoading } = useUser();

  const [userBlueprintsState, setUserBlueprintsState] =
    useState<Record<string, UserBlueprint>>(userBlueprints);

  // Convert userBlueprints to a Set of found blueprint IDs
  const initialFoundBlueprintsCount = useMemo(() => {
    return Object.values(userBlueprints).filter((bp) => bp.isFound).length;
  }, [userBlueprints]);

  const [, setFoundBlueprintsCount] = useState<number>(
    initialFoundBlueprintsCount
  );

  const [highlightText, setHighlightText] = useState<string>("");
  const [tab, setTab] = useState<CollectionCategory>("blueprints");

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
  const userId = user?.userId;

  const { handleClearAll, modalJsx } = useClearAll({
    userId,
    userBlueprintsState,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  const { handleUpload, isProcessing, fileInputRef } = useUpload({
    user,
    userBlueprintsState,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  const { handleFoundBlueprint } = useFoundBlueprint({
    userId,
    setUserBlueprintsState,
    setFoundBlueprintsCount,
  });

  const handleFavoriteBlueprint = (
    blueprintId: string,
    isFavorite: boolean
  ) => {
    if (!userId) {
      return;
    }
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        isFavorite,
      },
    }));
    try {
      updateUserBlueprintFavorite(userId, blueprintId, isFavorite);
    } catch (error: unknown) {
      toast.error("Error updating blueprint favorite state");
      setUserBlueprintsState((prev) => ({
        ...prev,
        [blueprintId]: {
          ...prev[blueprintId],
          isFavorite: !isFavorite,
        },
      }));
    }
  };

  const handleExtra = async (blueprintId: string, action: ExtraActionType) => {
    if (!userId) {
      return;
    }

    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        extraCount:
          action === ExtraActionType.Increment
            ? prev[blueprintId].extraCount + 1
            : prev[blueprintId].extraCount - 1,
      },
    }));

    try {
      await updateUserBlueprintExtra(userId, blueprintId, action);
    } catch (error: unknown) {
      toast.error("Error updating blueprint extra state");
      setUserBlueprintsState((prev) => ({
        ...prev,
        [blueprintId]: {
          ...prev[blueprintId],
          extraCount:
            action === ExtraActionType.Increment
              ? prev[blueprintId].extraCount - 1
              : prev[blueprintId].extraCount + 1,
        },
      }));
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="max-h-[calc(100vh-48px)] bg-black p-8">
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <div className="mb-6">
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
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name"
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
                className="text-white text-base bg-transparent border-b border-white focus:outline-none"
              />
            </div>
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
          </div>
        </div>

        {/* Grid Container */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          <div className="grid grid-cols-10 gap-2">
            {tabBlueprints.map((blueprint) => {
              const isFound =
                userBlueprintsState[blueprint.id]?.isFound || false;

              const isFavorite =
                userBlueprintsState[blueprint.id]?.isFavorite || false;

              const extraCount =
                userBlueprintsState[blueprint.id]?.extraCount || 0;

              const isHighlighted =
                (highlightText &&
                  blueprint.name
                    ?.toLowerCase()
                    .includes(highlightText.toLowerCase())) ||
                false;

              return (
                <BlueprintComponent
                  key={blueprint.id}
                  blueprint={blueprint}
                  isFound={isFound}
                  isFavorite={isFavorite}
                  extraCount={extraCount}
                  isHighlighted={isHighlighted}
                  handleFoundBlueprint={handleFoundBlueprint}
                  handleFavoriteBlueprint={handleFavoriteBlueprint}
                  handleExtra={handleExtra}
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
