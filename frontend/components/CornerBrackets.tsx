'use client';

import React from 'react';

interface CornerBracketsProps {
  colorClass?: string; // e.g. border-ncc-gold/60, border-ncc-sky/60
}

export default function CornerBrackets({ colorClass = 'border-ncc-gold/60' }: CornerBracketsProps) {
  return (
    <>
      {/* Top-Left Bracket */}
      <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 ${colorClass} opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-10`} />
      {/* Top-Right Bracket */}
      <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 ${colorClass} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-10`} />
      {/* Bottom-Left Bracket */}
      <div className={`absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 ${colorClass} opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 group-hover:translate-y-1 transition-all duration-200 pointer-events-none z-10`} />
      {/* Bottom-Right Bracket */}
      <div className={`absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 ${colorClass} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:translate-y-1 transition-all duration-200 pointer-events-none z-10`} />
    </>
  );
}
