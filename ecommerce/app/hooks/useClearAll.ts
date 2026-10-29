"use client";

import { resetUserBlueprints } from "@/app/actions/arc-blueprints-actions";
import { useConfirmModal } from "@/app/components/ConfirmModal";
import type { UserBlueprint } from "@/app/types";
import toast from "react-hot-toast";

type UseClearAllParams = {
  userId: string | undefined;
  userBlueprintsState: Record<string, UserBlueprint>;
  setUserBlueprintsState: React.Dispatch<
    React.SetStateAction<Record<string, UserBlueprint>>
  >;
  setFoundBlueprintsCount: React.Dispatch<React.SetStateAction<number>>;
};

export function useClearAll({
  userId,
  userBlueprintsState,
  setUserBlueprintsState,
  setFoundBlueprintsCount,
}: UseClearAllParams) {
  const { modalJsx, openModal } = useConfirmModal();

  const executeClearAll = () => {
    if (!userId) return;
    setFoundBlueprintsCount(0);
    const originalState = { ...userBlueprintsState };
    const resetState: Record<string, UserBlueprint> = {};
    Object.keys(userBlueprintsState).forEach((key) => {
      resetState[key] = {
        ...userBlueprintsState[key],
        isFound: false,
        isFavorite: false,
        extraCount: 0,
      };
    });
    setUserBlueprintsState(resetState);

    try {
      resetUserBlueprints(userId);
    } catch {
      toast.error("Error resetting blueprints");
      setUserBlueprintsState(originalState);
    }
  };

  const handleClearAll = () => {
    if (!userId) return;
    openModal({
      title: "Clear all blueprints?",
      message:
        "This will reset found blueprints, stencils, and designs, plus extras and favorites. This action cannot be undone.",
      confirmLabel: "Yes, clear all",
      onConfirm: executeClearAll,
    });
  };

  return { handleClearAll, modalJsx };
}
