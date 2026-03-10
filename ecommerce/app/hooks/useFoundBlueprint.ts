"use client";

import { updateUserBlueprintFound } from "@/app/actions/arc-blueprints-actions";
import type { UserBlueprint } from "@/app/types";
import toast from "react-hot-toast";

type UseFoundBlueprintParams = {
  userId: string | undefined;
  setUserBlueprintsState: React.Dispatch<
    React.SetStateAction<Record<string, UserBlueprint>>
  >;
  setFoundBlueprintsCount: React.Dispatch<React.SetStateAction<number>>;
};

export function useFoundBlueprint({
  userId,
  setUserBlueprintsState,
  setFoundBlueprintsCount,
}: UseFoundBlueprintParams) {
  const handleFoundBlueprint = (blueprintId: string, isFound: boolean) => {
    if (!userId) return;

    setFoundBlueprintsCount((prev) => (isFound ? prev + 1 : prev - 1));
    setUserBlueprintsState((prev) => ({
      ...prev,
      [blueprintId]: { ...prev[blueprintId], isFound },
    }));

    try {
      updateUserBlueprintFound(userId, blueprintId, isFound);
    } catch {
      toast.error("Error updating blueprint found state");
      setFoundBlueprintsCount((prev) => (isFound ? prev - 1 : prev + 1));
      setUserBlueprintsState((prev) => ({
        ...prev,
        [blueprintId]: { ...prev[blueprintId], isFound: !isFound },
      }));
    }
  };

  return { handleFoundBlueprint };
}
