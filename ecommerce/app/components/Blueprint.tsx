"use client";

import { ExtraActionType, type Blueprint } from "@/app/types";
import { useState } from "react";

type BlueprintProps = {
  blueprint: Blueprint;
  isFound: boolean;
  isFavorite: boolean;
  extraCount: number;
  handleFavoriteBlueprint?: (blueprintId: string, isFavorite: boolean) => void;
  handleFoundBlueprint?: (blueprintId: string, isFound: boolean) => void;
  handleExtra?: (blueprintId: string, action: ExtraActionType) => void;
  isDraggable?: boolean;
  isHighlighted?: boolean;
};

export function BlueprintComponent({
  blueprint,
  isFound,
  isFavorite,
  extraCount,
  handleFoundBlueprint,
  handleFavoriteBlueprint,
  handleExtra,
  isDraggable = false,
  isHighlighted = false,
}: BlueprintProps) {
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    if (isDraggable) {
      return;
    }
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    if (isDraggable) {
      return;
    }
    setIsHovered(false);
  };
  if (blueprint.id.startsWith("extra_") || !blueprint.icon) {
    return (
      <div
        key={blueprint.id}
        className={`w-full h-full aspect-square flex flex-col overflow-hidden ${isDraggable ? "" : "hover:opacity-90 transition-opacity cursor-pointer"}`}
      >
        <div
          className="w-full h-full bg-black rounded-md"
          style={{ border: "1px solid rgba(255, 255, 255, 0.2)" }}
        />
      </div>
    );
  }

  return (
    <div
      key={blueprint.id}
      className={`w-full h-full aspect-square flex flex-col border overflow-hidden ${isDraggable ? "" : "hover:opacity-90 transition-opacity cursor-pointer"}`}
      style={{
        border: isHighlighted
          ? "1px solid rgb(0, 89, 255)"
          : extraCount > 0
            ? isFound
              ? "1px solid rgba(88, 173, 154, 0.58)"
              : "1px solid rgba(88, 173, 154, 0.72)"
            : isFound
              ? "1px solid rgba(255, 255, 255, 0.2)"
              : isFavorite
                ? "1px solid rgb(255, 198, 0)"
                : "1px solid rgba(255, 255, 255, 0.6)",
        borderRadius: "5px",
        opacity: isFound ? 0.78 : 1,
      }}
      onClick={() => {
        // Don't handle click if draggable - let GridItem handle drag instead
        if (isDraggable) {
          return;
        }
        handleFoundBlueprint?.(blueprint.id, !isFound);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Content Area */}
      <div
        className="flex-1 relative"
        style={{
          background:
            'url("https://cdn.metaforge.app/arc-raiders/ui/blueprint-bg.webp") center center / cover',
        }}
      >
        {/* Blueprint Image/Icon */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <img
            src={blueprint.icon}
            alt={blueprint.name}
            width={100}
            height={100}
            className="object-contain opacity-80"
            draggable={false}
          />
        </div>

        {/* Found Indicator (Top Right) */}
        {isFound && (
          <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Black Footer */}
      <div className="h-5 bg-black relative">
        {/* Details Indicator (Bottom Left) */}
        <div className="absolute left-0.5 w-5 h-5 flex items-center justify-center">
          <img
            src="/book.bmp"
            alt="Details"
            width={12}
            height={12}
            className="object-contain"
            draggable={false}
          />
        </div>
        {/* Extra Indicator (Bottom Middle) */}
        <div className="absolute left-1/2 -translate-x-1/2 h-5 px-1 text-white text-xs leading-none flex items-center">
          {handleExtra && (
            <button
              type="button"
              className="w-3 h-5 flex items-center justify-center transition-opacity duration-150 hover:opacity-80"
              style={{
                opacity: isHovered && extraCount > 0 ? 1 : 0,
                pointerEvents: isHovered && extraCount > 0 ? "auto" : "none",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isDraggable || extraCount <= 0) {
                  return;
                }
                handleExtra(blueprint.id, ExtraActionType.Decrement);
              }}
            >
              <svg
                className="w-2 h-2"
                viewBox="0 0 8 8"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M1.5 1.5H6.5L4 6.5L1.5 1.5Z" fill="white" />
              </svg>
            </button>
          )}
          <span
            className="text-center transition-opacity duration-150"
            style={{ opacity: extraCount > 0 || isHovered ? 1 : 0 }}
          >
            +{extraCount}
          </span>

          {handleExtra && (
            <button
              type="button"
              className="w-3 h-5 flex items-center justify-center transition-opacity duration-150 hover:opacity-80"
              style={{
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? "auto" : "none",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isDraggable) {
                  return;
                }
                handleExtra(blueprint.id, ExtraActionType.Increment);
              }}
            >
              <svg
                className="w-2 h-2"
                viewBox="0 0 8 8"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M4 1.5L6.5 6.5H1.5L4 1.5Z" fill="white" />
              </svg>
            </button>
          )}
        </div>
        {/* Favorite Star (Bottom Left, next to details) */}
        <div
          className="absolute right-0.5 w-5 h-5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (isDraggable) {
              return;
            }
            handleFavoriteBlueprint?.(blueprint.id, !isFavorite);
          }}
        >
          <svg
            className="w-4 h-4"
            fill={isFavorite ? "#FFD700" : "none"}
            stroke={isFavorite ? "#FFD700" : "white"}
            strokeWidth={isFavorite ? 0 : 1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
