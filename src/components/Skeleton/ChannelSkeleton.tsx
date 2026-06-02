import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const ChannelSkeleton = ({ orientation = 'landscape', uiMode = 'modern' }: { orientation?: 'landscape' | 'portrait', uiMode?: string }) => {
  return (
    <div className={cn(
      "relative flex-shrink-0 animate-pulse",
      orientation === 'landscape' ? "w-48 sm:w-72" : "w-40 sm:w-56"
    )}>
      <div 
        className={cn(
          "w-full bg-white/5 overflow-hidden border border-white/10",
          uiMode === 'modern' ? "rounded-[2rem]" : "rounded-none",
          orientation === 'landscape' ? "aspect-video" : "aspect-[2/3]"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      <div className="mt-4 space-y-2 px-2">
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
        <div className="h-3 w-1/2 bg-white/5 rounded-full" />
      </div>
    </div>
  );
};

export const RowSkeleton = ({ uiMode = 'modern' }: { uiMode?: string }) => {
  return (
    <div className="space-y-6 px-4 md:px-12 py-8">
      <div className="h-8 w-48 bg-white/10 rounded-xl" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <ChannelSkeleton key={i} uiMode={uiMode} />
        ))}
      </div>
    </div>
  );
};
