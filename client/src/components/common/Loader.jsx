/* Skeleton shimmer for individual rows */
export const SkeletonRow = ({ lines = 2 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-3.5 skeleton rounded"
        style={{ width: `${70 + (i % 3) * 10}%` }}
      />
    ))}
  </div>
);

/* Full card skeleton */
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-2xl border border-surface-200 p-5 space-y-3 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 skeleton rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 skeleton rounded w-2/3" />
        <div className="h-3 skeleton rounded w-1/3" />
      </div>
    </div>
    <div className="h-3 skeleton rounded w-full" />
    <div className="h-3 skeleton rounded w-4/5" />
  </div>
);

/* Inline spinner */
export const Spinner = ({ size = 20, className = '' }) => (
  <div
    className={`border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
    style={{ width: size, height: size }}
  />
);

/* Default full-section loader */
const Loader = ({ fullPage = false, text = 'Loading…' }) => {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg animate-pulse">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-500">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
};

export default Loader;
