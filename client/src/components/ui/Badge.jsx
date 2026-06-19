import { X } from 'lucide-react';

const variants = {
  default:  'bg-primary-50  text-primary-700  ring-1 ring-primary-100',
  blue:     'bg-blue-50     text-blue-700     ring-1 ring-blue-100',
  green:    'bg-emerald-50  text-emerald-700  ring-1 ring-emerald-100',
  yellow:   'bg-amber-50    text-amber-700    ring-1 ring-amber-100',
  red:      'bg-rose-50     text-rose-700     ring-1 ring-rose-100',
  violet:   'bg-violet-50   text-violet-700   ring-1 ring-violet-100',
  gray:     'bg-surface-100 text-gray-600     ring-1 ring-surface-200',
  dark:     'bg-gray-800    text-gray-100',
  outline:  'bg-transparent text-gray-600     ring-1 ring-gray-200',
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
        className="ml-0.5 rounded hover:bg-black/10 p-0.5 transition-colors"
        aria-label="Remove"
      >
        <X size={9} />
      </button>
    )}
  </span>
);

export default Badge;
