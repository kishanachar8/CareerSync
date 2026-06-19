import { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const Input = forwardRef(
  ({ label, error, type = 'text', className = '', id, prefix, suffix, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId    = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-400 pointer-events-none">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={[
              'w-full py-2.5 border rounded-xl text-sm transition-all duration-150',
              'placeholder:text-gray-400 text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
              error
                ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-400/30 focus:border-rose-400'
                : 'border-surface-200 bg-white hover:border-surface-300',
              prefix  ? 'pl-9' : 'pl-3.5',
              (isPassword || suffix) ? 'pr-10' : 'pr-3.5',
              className,
            ].join(' ')}
            {...props}
          />
          {/* Suffix or password toggle */}
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          ) : suffix ? (
            <span className="absolute right-3 text-gray-400 pointer-events-none">{suffix}</span>
          ) : error ? (
            <AlertCircle size={15} className="absolute right-3 text-rose-400 pointer-events-none" />
          ) : null}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
