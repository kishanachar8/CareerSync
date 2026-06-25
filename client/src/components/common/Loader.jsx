/* Full card skeleton */
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-elevated rounded-2xl border border-line p-5 space-y-3 ${className}`}>
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

/* Default full-section loader — the standard "loading screen" used whenever
   a page/section is waiting on data, with no skeleton shape to show yet. */
const Loader = ({ fullPage = false, text = 'Loading…' }) => {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas/90 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow animate-pulse">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-ink-muted">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-ink-muted">{text}</p>
    </div>
  );
};

export default Loader;
