const variants = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md border-transparent',
  secondary: 'bg-white text-gray-700 border-surface-200 hover:bg-surface-50 hover:border-surface-300 shadow-xs',
  danger:    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm border-transparent',
  ghost:     'bg-transparent text-gray-600 hover:bg-surface-100 hover:text-gray-800 border-transparent',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-transparent',
  outline:   'bg-transparent text-primary-600 border-primary-300 hover:bg-primary-50 hover:border-primary-400',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1.5',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-[15px] gap-2',
  xl: 'px-6 py-3 text-base gap-2.5',
};

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={[
      'inline-flex items-center justify-center font-medium rounded-xl border',
      'transition-all duration-150 focus:outline-none focus-visible:ring-2',
      'focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      className,
    ].join(' ')}
    {...props}
  >
    {loading ? (
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
    ) : null}
    {children}
  </button>
);

export default Button;
