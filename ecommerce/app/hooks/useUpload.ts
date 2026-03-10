"use client";

import { recognizeBlueprintsFromImage } from "@/app/actions/blueprint-recognizer-actions";
import type { User } from "@/app/components/UserProvider";
import type { UserBlueprint } from "@/app/types";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type UseUploadParams = {
  user: User | null;
  userBlueprintsState: Record<string, UserBlueprint>;
  setUserBlueprintsState: React.Dispatch<
    React.SetStateAction<Record<string, UserBlueprint>>
  >;
  setFoundBlueprintsCount: React.Dispatch<React.SetStateAction<number>>;
};

export function useUpload({
  user,
  userBlueprintsState,
  setUserBlueprintsState,
  setFoundBlueprintsCount,
}: UseUploadParams) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (!file) return;
    if (!user) {
      toast.error("Please log in to use image recognition");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing image...");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const result = await recognizeBlueprintsFromImage(user.userId, formData);
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(result.message);

        if (result.matches) {
          const updates: Record<string, UserBlueprint> = {};
          let newFoundCount = 0;

          result.matches.forEach((match) => {
            if (match.blueprint) {
              if (!userBlueprintsState[match.blueprint]?.isFound) {
                newFoundCount++;
              }
              updates[match.blueprint] = {
                ...userBlueprintsState[match.blueprint],
                id: match.blueprint,
                isFound: true,
                isFavorite:
                  userBlueprintsState[match.blueprint]?.isFavorite || false,
                extraCount:
                  userBlueprintsState[match.blueprint]?.extraCount || 0,
              };
            }
          });

          setUserBlueprintsState((prev) => ({ ...prev, ...updates }));
          setFoundBlueprintsCount((prev) => prev + newFoundCount);
        }

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

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], "pasted-image.png", {
              type: blob.type || "image/png",
            });
            await processImage(file);
          }
          break;
        }
      }
    },
    [isProcessing]
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  return { handleUpload, isProcessing, fileInputRef };
}
