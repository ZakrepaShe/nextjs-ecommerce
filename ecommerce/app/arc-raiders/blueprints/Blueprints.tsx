"use client";

import type { Blueprint } from "@/app/types";
import { useUser } from "@/app/components/UserProvider";
import { useState } from "react";

export default function Blueprints({ blueprints }: { blueprints: Blueprint[] }) {
  const { user } = useUser();
  // TODO: Replace with actual found status from database
  const [foundBlueprints] = useState<Set<string>>(new Set());
  
  const foundCount = blueprints.filter(bp => foundBlueprints.has(bp.id)).length;
  const totalCount = blueprints.length;

  return (
    <div className="max-h-[calc(100vh-48px)] bg-black p-8">
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white uppercase mb-2">BLUEPRINTS</h1>
          <p className="text-white uppercase text-sm">FOUND: {foundCount}/{totalCount}</p>
        </div>

        {/* Grid Container */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          <div className="grid grid-cols-10 gap-2">
            {blueprints.map((blueprint) => {
              const isFound = foundBlueprints.has(blueprint.id);

              return (
                <div
                  key={blueprint.id}
                  className="aspect-square flex flex-col border hover:opacity-90 cursor-pointer transition-opacity max-w-100 max-h-100 overflow-hidden"
                  style={{
                    border: isFound ? '1px solid rgb(255, 198, 0)' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '5px',
                  }}
                >
                  {/* Main Content Area */}
                  <div 
                    className="flex-1 relative"
                    style={{
                      background: 'url("https://cdn.metaforge.app/arc-raiders/ui/blueprint-bg.webp") center center / cover',
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
                      />
                    </div>

                    {/* Found Indicator (Top Right) */}
                    {isFound && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-950 border border-blue-400/60 flex items-center justify-center">
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
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}