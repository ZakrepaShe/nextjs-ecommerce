import type { Blueprint } from "@/app/types";

type BlueprintProps = {
  blueprint: Blueprint;
  isFound: boolean;
  isFavorite: boolean;
  handleUnfavoriteBlueprint?: (blueprintId: string) => void;
  handleFavoriteBlueprint?: (blueprintId: string) => void;
  handleFoundBlueprint?: (blueprintId: string) => void;
  handleUnfoundBlueprint?: (blueprintId: string) => void;
  isDraggable?: boolean;
  isHighlighted?: boolean;
};

export function BlueprintComponent({
  blueprint,
  isFound,
  isFavorite,
  handleUnfoundBlueprint,
  handleFoundBlueprint,
  handleFavoriteBlueprint,
  handleUnfavoriteBlueprint,
  isDraggable = false,
  isHighlighted = false,
}: BlueprintProps) {
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
        border:
          isHighlighted
            ? "1px solid rgb(0, 89, 255)"
            : isFound
              ? "1px solid rgba(255, 255, 255, 0.2)"
              : isFavorite
                ? "1px solid rgb(255, 198, 0)"
                : "1px solid rgba(255, 255, 255, 0.6)",
        borderRadius: "5px",
        opacity: isFound ? 0.6 : 1,
      }}
      onClick={(e) => {
        // Don't handle click if draggable - let GridItem handle drag instead
        if (isDraggable) {
          return;
        }
        if (isFound) {
          handleUnfoundBlueprint?.(blueprint.id);
        } else {
          handleFoundBlueprint?.(blueprint.id);
        }
      }}
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
        {/* Favorite Star (Bottom Left, next to details) */}
        <div
          className="absolute right-0.5 w-5 h-5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (isDraggable) {
              return;
            }
            if (isFavorite) {
              handleUnfavoriteBlueprint?.(blueprint.id);
            } else {
              handleFavoriteBlueprint?.(blueprint.id);
            }
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
