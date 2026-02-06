"use client";

import { updateUserBlueprintFavorite, updateUserBlueprintFound } from "@/app/actions/arc-blueprints-actions";
import { recognizeBlueprintsFromImage } from "@/app/actions/blueprint-recognizer-actions";
import { useUser } from "@/app/components/UserProvider";
import type { Blueprint, UserBlueprint } from "@/app/types";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { BlueprintComponent } from "../../components/Blueprint";
import toast from "react-hot-toast";

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

  const [foundBlueprintsCount, setFoundBlueprintsCount] = useState<number>(
    initialFoundBlueprintsCount
  );

  const [highlightText, setHighlightText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFavoriteBlueprint = (blueprintId: string) => {
    updateUserBlueprintFavorite(user?.userId, blueprintId, true);
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        isFavorite: !prev[blueprintId]?.isFavorite,
      },
    }));
  };

  const handleUnfavoriteBlueprint = (blueprintId: string) => {
    updateUserBlueprintFavorite(user?.userId, blueprintId, false);
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: {
        ...prev[blueprintId],
        isFavorite: false,
      },
    }));
  };

  const processImage = async (file: File) => {
    if (!file) {
      return;
    }

    if (!user) {
      toast.error("Please log in to use image recognition");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing image...");

    try {
      // Create FormData and append the file
      const formData = new FormData();
      formData.append("image", file);

      // Send to server for processing
      const result = await recognizeBlueprintsFromImage(user.userId, formData);

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(result.message);

        // Update local state for found blueprints
        if (result.matches) {
          const updates: Record<string, UserBlueprint> = {};
          let newFoundCount = 0;

          result.matches.forEach((match) => {
            if (match.blueprint) {
              // Only update if not already found
              if (!userBlueprintsState[match.blueprint]?.isFound) {
                newFoundCount++;
              }
              updates[match.blueprint] = {
                ...userBlueprintsState[match.blueprint],
                id: match.blueprint,
                isFound: true,
                isFavorite:
                  userBlueprintsState[match.blueprint]?.isFavorite || false,
              };
            }
          });

          setUserBlueprintsState((prev) => ({
            ...prev,
            ...updates,
          }));

          setFoundBlueprintsCount((prev) => prev + newFoundCount);
        }

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error processing image:", error);
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (isProcessing) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }

    // Find image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          // Convert blob to File object
          const file = new File([blob], "pasted-image.png", {
            type: blob.type || "image/png",
          });
          await processImage(file);
        }
        break;
      }
    }
  }, [isProcessing]);

  useEffect(() => {
    // Add paste event listener
    window.addEventListener("paste", handlePaste);

    return () => {
      // Cleanup: remove event listener on unmount
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  return (
    <div className="max-h-[calc(100vh-48px)] bg-black p-8">
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">
            BLUEPRINTS
          </h1>
          <div className="flex items-center justify-between gap-2">
            <p className="text-white uppercase text-sm">
              FOUND: {foundBlueprintsCount}/{totalCount}
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
          </div>
        </div>

        {/* Grid Container */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
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

              const isHighlighted = highlightText && blueprint.name?.toLowerCase().includes(highlightText.toLowerCase()) || false;

              return (
                <BlueprintComponent
                  key={blueprint.id}
                  blueprint={blueprint}
                  isFound={isFound}
                  isFavorite={isFavorite}
                  isHighlighted={isHighlighted}
                  handleUnfoundBlueprint={handleUnfoundBlueprint}
                  handleFoundBlueprint={handleFoundBlueprint}
                  handleFavoriteBlueprint={handleFavoriteBlueprint}
                  handleUnfavoriteBlueprint={handleUnfavoriteBlueprint}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
