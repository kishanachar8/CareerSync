/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    { pattern: /^(bg|text|border|ring|from|to|via|fill|stroke)-surface/ },
    { pattern: /^animate-/ },
    'shadow-card',
    'shadow-card-hover',
    'shadow-glow',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand — vivid magenta-purple, paired with `violet` for duotone
        // gradients across heroes/sidebars/CTAs. Every existing page already
        // references primary-*/violet-* by name, so retuning the hex values
        // here re-skins the whole app's brand color without touching pages.
        primary: {
          50:  '#fdf2ff',
          100: '#fce4ff',
          200: '#f8c6ff',
          300: '#f29aff',
          400: '#e85cff',
          500: '#d521f0',
          600: '#b910cf',
          700: '#960dab',
          800: '#780f87',
          900: '#630f6c',
          950: '#3d0541',
        },
        violet: {
          50:  '#f2f0ff',
          100: '#e6e1ff',
          200: '#cdc3ff',
          300: '#aa98ff',
          400: '#8266ff',
          500: '#6633ff',
          600: '#5417f0',
          700: '#4310c7',
          800: '#370fa3',
          900: '#2f1184',
          950: '#1c0860',
        },
        // New: warm energetic highlight for badges/icons/secondary CTAs —
        // sparing use only, not a primary surface color.
        accent: {
          50:  '#fff4ed',
          100: '#ffe6d5',
          200: '#ffc8a8',
          300: '#ffa066',
          400: '#ff7a33',
          500: '#ff5a1f',
          600: '#e8430a',
          700: '#c1350a',
          800: '#9a2c0e',
          900: '#7c280f',
        },
        emerald: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        rose: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Legacy literal scale — kept as-is so pages not yet swept to the
        // new dark-mode tokens below don't lose their existing borders/bg.
        surface: {
          DEFAULT: '#ffffff',
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
        },
        // ─── Dark-mode-aware semantic tokens (CSS vars, flip with the
        // `dark` class on <html>). New components/pages should use these
        // instead of bg-white / text-gray-900 / border-surface-200 so they
        // respond to the theme toggle automatically.
        canvas:   'rgb(var(--canvas) / <alpha-value>)',
        elevated: {
          DEFAULT: 'rgb(var(--elevated) / <alpha-value>)',
          2:       'rgb(var(--elevated-2) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted:   'rgb(var(--ink-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'xs':   '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':   '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'md':   '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'lg':   '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)',
        'xl':   '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        'card': '0 0 0 1px rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 0 0 1px rgb(217 16 207 / 0.18), 0 4px 16px 0 rgb(217 16 207 / 0.10)',
        'glow':  '0 0 24px rgb(217 16 207 / 0.30)',
        'glow-violet': '0 0 24px rgb(84 23 240 / 0.30)',
        'inner': 'inset 0 1px 4px 0 rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #b910cf 0%, #5417f0 100%)',
        'gradient-warm':  'linear-gradient(135deg, #ff5a1f 0%, #b910cf 100%)',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 .5H31.5V32' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-out',
        'slide-up':      'slideUp 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'shimmer':       'shimmer 2s infinite linear',
        'pulse-dot':     'pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
