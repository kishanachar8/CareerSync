import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import { toggleTheme } from '../../features/ui/uiSlice.js';

// A switch (not a bare icon button) — the track + sliding pill reads
// unambiguously as "this is a toggle-able setting" at a glance, where a
// single icon blended in with the other navbar icons and went unnoticed.
const ThemeToggle = ({ className = '' }) => {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center justify-between w-14 h-7 px-1.5 rounded-full border border-line bg-elevated-2 transition-colors focus-ring ${className}`}
    >
      <Sun size={13} className={`relative z-10 transition-colors ${!isDark ? 'text-amber-500' : 'text-ink-muted/50'}`} />
      <Moon size={13} className={`relative z-10 transition-colors ${isDark ? 'text-primary-300' : 'text-ink-muted/50'}`} />
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-elevated shadow-sm transition-all duration-200 ${
          isDark ? 'left-[26px]' : 'left-1'
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
