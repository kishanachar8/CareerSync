import { X } from 'lucide-react';

const variants = {
  default:  'bg-primary-50 text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-800',
  blue:     'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
  green:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
  yellow:   'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
  red:      'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
  violet:   'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
  accent:   'bg-accent-50 text-accent-700 ring-1 ring-accent-200 dark:bg-accent-900/40 dark:text-accent-300 dark:ring-accent-800',
  gray:     'bg-elevated-2 text-ink-muted ring-1 ring-line',
  dark:     'bg-slate-800 text-slate-100',
  outline:  'bg-transparent text-ink-muted ring-1 ring-line',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px] rounded-md',
  md: 'px-2.5 py-1 text-xs rounded-lg',
};

const Badge = ({
  children,
  variant  = 'default',
  size     = 'md',
  onRemove,
  className = '',
  dot,
}) => (
  <span
    className={[
      'inline-flex items-center gap-1 font-medium',
      variants[variant] || variants.gray,
      sizes[size] || sizes.md,
      className,
    ].join(' ')}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
    {children}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
        aria-label="Remove"
      >
        <X size={9} />
      </button>
    )}
  </span>
);

export default Badge;
