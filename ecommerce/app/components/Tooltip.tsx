"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  text: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export function Tooltip({ text, children, disabled = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isShown, setIsShown] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    const child = wrapperRef.current?.firstElementChild as HTMLElement | null;
    if (child) {
      const rect = child.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    updatePos();
    setIsVisible(true);
    // Defer opacity so the DOM node exists before the transition starts
    showTimerRef.current = setTimeout(() => setIsShown(true), 10);
  };

  const handleMouseLeave = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    setIsShown(false);
    // Keep the node mounted long enough for the fade-out to finish
    setTimeout(() => setIsVisible(false), 150);
  };

  useEffect(() => {
    if (!isVisible) return;
    window.addEventListener("scroll", updatePos, { capture: true, passive: true });
    window.addEventListener("resize", updatePos, { passive: true });
    return () => {
      window.removeEventListener("scroll", updatePos, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [isVisible, updatePos]);

  const tooltip =
    isVisible && !disabled
      ? createPortal(
          <div
            className="pointer-events-none"
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
              whiteSpace: "nowrap",
              opacity: isShown ? 1 : 0,
              transition: "opacity 150ms ease",
            }}
          >
            <div
              className="text-white text-xs font-medium px-2 py-1 rounded shadow-lg"
              style={{
                background: "rgba(0,0,0,0.88)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {text}
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid rgba(255,255,255,0.18)",
              }}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "contents" }}
    >
      {tooltip}
      {children}
    </div>
  );
}
