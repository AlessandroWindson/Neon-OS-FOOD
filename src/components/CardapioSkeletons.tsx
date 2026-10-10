import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  readingMode?: boolean;
}

// 1. Stories Bar Skeleton (Top horizontal circle avatars)
export const StoriesBarSkeleton: React.FC<SkeletonProps> = ({ readingMode = false }) => {
  const shimmerClass = readingMode ? 'skeleton-shimmer-light' : 'skeleton-shimmer';
  const blockClass = readingMode ? 'bg-zinc-200' : 'bg-zinc-800/80';

  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 scrollbar-none">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
          {/* Circular ring + image skeleton */}
          <div
            className={`p-[2.5px] rounded-full ${
              readingMode ? 'bg-zinc-200' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full ${blockClass} ${shimmerClass}`}
            />
          </div>

          {/* Name line skeleton */}
          <div className={`h-3 w-14 rounded-md ${blockClass} ${shimmerClass}`} />

          {/* Count badge skeleton */}
          <div className={`h-3 w-10 rounded-full ${blockClass} ${shimmerClass}`} />
        </div>
      ))}
    </div>
  );
};

// 2. Explore Categories Showcase Skeleton (Carousel & Bento)
interface CategoryShowcaseSkeletonProps extends SkeletonProps {
  viewMode?: 'carousel' | 'bento';
}

export const CategoryShowcaseSkeleton: React.FC<CategoryShowcaseSkeletonProps> = ({
  readingMode = false,
  viewMode = 'carousel',
}) => {
  const shimmerClass = readingMode ? 'skeleton-shimmer-light' : 'skeleton-shimmer';
  const blockClass = readingMode ? 'bg-zinc-200' : 'bg-zinc-800/80';
  const cardBg = readingMode ? 'bg-white border-2 border-zinc-200' : 'bg-zinc-900/80 border border-zinc-800/80';

  if (viewMode === 'bento') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className={`rounded-2xl h-48 p-4 flex flex-col justify-end gap-2.5 overflow-hidden relative ${cardBg}`}
          >
            <div className={`absolute inset-0 ${blockClass} ${shimmerClass} opacity-40`} />
            <div className="relative z-10 space-y-2">
              <div className={`h-5 w-32 rounded-lg ${blockClass} ${shimmerClass}`} />
              <div className={`h-3 w-44 rounded ${blockClass} ${shimmerClass}`} />
              <div className={`h-4 w-24 rounded-full ${blockClass} ${shimmerClass}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className={`shrink-0 w-36 sm:w-40 rounded-2xl p-3 flex flex-col justify-between gap-3 ${cardBg}`}
        >
          {/* Image box */}
          <div className={`w-full aspect-[4/3] rounded-xl ${blockClass} ${shimmerClass}`} />

          {/* Details */}
          <div className="space-y-1.5">
            <div className={`h-4 w-24 rounded ${blockClass} ${shimmerClass}`} />
            <div className={`h-3 w-16 rounded ${blockClass} ${shimmerClass}`} />
          </div>

          {/* Tag line */}
          <div className={`h-3 w-20 rounded-full ${blockClass} ${shimmerClass}`} />
        </div>
      ))}
    </div>
  );
};

// 3. Sticky Category Nav Pills Skeleton
export const StickyCategoryNavSkeleton: React.FC<SkeletonProps> = ({ readingMode = false }) => {
  const shimmerClass = readingMode ? 'skeleton-shimmer-light' : 'skeleton-shimmer';
  const blockClass = readingMode ? 'bg-zinc-200' : 'bg-zinc-800/80';

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className={`h-9 sm:h-10 rounded-xl px-4 flex items-center gap-2 shrink-0 ${
            readingMode ? 'bg-zinc-100 border border-zinc-200' : 'bg-zinc-900/90 border border-zinc-800/80'
          }`}
        >
          <div className={`w-6 h-6 rounded-full ${blockClass} ${shimmerClass}`} />
          <div className={`h-3.5 w-16 sm:w-20 rounded ${blockClass} ${shimmerClass}`} />
          <div className={`h-3 w-6 rounded-full ${blockClass} ${shimmerClass}`} />
        </div>
      ))}
    </div>
  );
};

// 4. Category Section Header Skeleton
export const CategoryHeaderSkeleton: React.FC<SkeletonProps> = ({ readingMode = false }) => {
  const shimmerClass = readingMode ? 'skeleton-shimmer-light' : 'skeleton-shimmer';
  const blockClass = readingMode ? 'bg-zinc-200' : 'bg-zinc-800/80';
  const bannerBg = readingMode ? 'bg-white border-2 border-zinc-200' : 'bg-zinc-900/90 border border-zinc-800/90';

  return (
    <div className={`relative rounded-2xl overflow-hidden p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${bannerBg}`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-2xl shrink-0 ${blockClass} ${shimmerClass}`} />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`h-6 w-36 sm:w-48 rounded-lg ${blockClass} ${shimmerClass}`} />
            <div className={`h-5 w-16 rounded-md ${blockClass} ${shimmerClass}`} />
          </div>
          <div className={`h-3.5 w-48 sm:w-80 rounded ${blockClass} ${shimmerClass}`} />
        </div>
      </div>
      <div className={`h-8 w-28 rounded-xl shrink-0 self-end sm:self-center ${blockClass} ${shimmerClass}`} />
    </div>
  );
};

// 5. Product Item Card Skeleton (matching ProductListItem)
export const ProductItemSkeleton: React.FC<SkeletonProps> = ({ readingMode = false }) => {
  const shimmerClass = readingMode ? 'skeleton-shimmer-light' : 'skeleton-shimmer';
  const blockClass = readingMode ? 'bg-zinc-200' : 'bg-zinc-800/80';
  const cardBg = readingMode ? 'bg-white border-2 border-zinc-200' : 'bg-[#111116] border border-zinc-800/80';

  return (
    <div className={`rounded-2xl p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 shadow-sm ${cardBg}`}>
      {/* Product Image Skeleton */}
      <div
        className={`w-28 sm:w-36 h-28 sm:h-36 shrink-0 rounded-xl ${blockClass} ${shimmerClass}`}
      />

      {/* Product Content Skeleton */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          {/* Category mini badge */}
          <div className={`h-3 w-20 rounded ${blockClass} ${shimmerClass}`} />

          {/* Title */}
          <div className={`h-5 w-36 sm:w-52 rounded-lg ${blockClass} ${shimmerClass}`} />

          {/* Description lines */}
          <div className="space-y-1.5 pt-1">
            <div className={`h-3 w-full rounded ${blockClass} ${shimmerClass}`} />
            <div className={`h-3 w-4/5 rounded ${blockClass} ${shimmerClass}`} />
          </div>

          {/* Tag pills */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className={`h-4 w-12 rounded ${blockClass} ${shimmerClass}`} />
            <div className={`h-4 w-14 rounded ${blockClass} ${shimmerClass}`} />
          </div>
        </div>

        {/* Price and Action button */}
        <div className={`flex items-center justify-between gap-2 pt-2.5 mt-1 border-t ${
          readingMode ? 'border-zinc-200' : 'border-zinc-800/80'
        }`}>
          <div className={`h-7 w-20 rounded-xl ${blockClass} ${shimmerClass}`} />
          <div className={`h-7 w-24 rounded-xl ${blockClass} ${shimmerClass}`} />
        </div>
      </div>
    </div>
  );
};

// 6. Full Product Section Skeleton (Multiple cards grid)
interface ProductSectionSkeletonProps extends SkeletonProps {
  count?: number;
}

export const ProductSectionSkeleton: React.FC<ProductSectionSkeletonProps> = ({
  readingMode = false,
  count = 4,
}) => {
  return (
    <div className="space-y-4">
      <CategoryHeaderSkeleton readingMode={readingMode} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <ProductItemSkeleton key={idx} readingMode={readingMode} />
        ))}
      </div>
    </div>
  );
};
