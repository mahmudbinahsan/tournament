/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--app-font-family, Inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          // Theme-driven tokens. Each maps to a CSS variable defined in
          // `src/core/theme/themes.ts` and applied at runtime via applyTheme().
          // Fallback values reproduce the original Champion Elite palette so
          // the app renders correctly even before the theme is applied.
          //
          // Depth ramp (Champion Elite, warm graphite — not blue-grey):
          //   bg → surface (+3-4%) → card (+3-4%). Surfaces sit between the
          //   background and cards so controls read as recessed into the page
          //   while cards read as elevated panels above them.
          bg: 'var(--app-bg, #0E0E11)',
          surface: 'var(--app-surface, #141417)',
          'surface-2': 'var(--app-surface-2, #18181B)',
          'surface-3': 'var(--app-surface-3, #1D1D21)',
          // `solid` is the shared surface ramp used by inputs, selects,
          // badges, chips, toolbars and section containers. It mirrors the
          // surface ramp so every control inherits the theme automatically.
          solid: 'var(--app-surface, #141417)',
          'solid-2': 'var(--app-surface-2, #18181B)',
          'solid-3': 'var(--app-surface-3, #1D1D21)',
          card: 'var(--app-card, #1B1B1F)',
          'card-hover': 'var(--app-card-hover, #212125)',
          // Zebra card — subtle alternating shade for vertical card lists.
          // Falls back to the regular card surface so themes without a zebra
          // token render cleanly with no visible striping.
          'zebra-card': 'var(--app-zebra-card, var(--app-card, #1B1B1F))',
          'zebra-card-hover': 'var(--app-zebra-card-hover, var(--app-card-hover, #212125))',
          border: 'var(--app-border, rgba(255,255,255,0.08))',
          'border-strong': 'var(--app-border-strong, rgba(255,255,255,0.14))',
        },
        gold: {
          50: 'var(--accent-50, #FBF6EC)',
          100: 'var(--accent-100, #F5EAD0)',
          200: 'var(--accent-200, #EAD29A)',
          300: 'var(--accent-300, #DCB866)',
          400: 'var(--accent-400, #CDA23E)',
          500: 'var(--accent-500, #B88A2A)',
          600: 'var(--accent-600, #9A7220)',
          700: 'var(--accent-700, #7A5A1C)',
          800: '#5C4418',
          900: '#3F2F12',
        },
        // Semantic status colors. Each maps to a mode-scoped CSS variable
        // (light vs dark) so text/accents stay readable on every theme.
        success: {
          300: 'var(--success-300, #6EE7B7)',
          400: 'var(--success-400, #34D399)',
          500: 'var(--success-500, #10B981)',
          600: 'var(--success-600, #059669)',
        },
        warning: {
          300: 'var(--warning-300, #FCD34D)',
          400: 'var(--warning-400, #FBBF24)',
          500: 'var(--warning-500, #F59E0B)',
          600: 'var(--warning-600, #D97706)',
        },
        danger: {
          300: 'var(--danger-300, #FCA5A5)',
          400: 'var(--danger-400, #F87171)',
          500: 'var(--danger-500, #EF4444)',
          600: 'var(--danger-600, #DC2626)',
        },
        third: {
          300: 'var(--third-300, #FDBA74)',
          400: 'var(--third-400, #FB923C)',
          500: 'var(--third-500, #F97316)',
          600: 'var(--third-600, #EA580C)',
        },
        // Secondary accent — the warm complement on two-tone themes (Aurora
        // Noir). Falls back to the primary accent ramp when unset so every
        // other theme inherits the primary accent automatically.
        amber: {
          300: 'var(--accent-secondary-300, var(--accent-300, #DCB866))',
          400: 'var(--accent-secondary-400, var(--accent-400, #CDA23E))',
          500: 'var(--accent-secondary-500, var(--accent-500, #B88A2A))',
          600: 'var(--accent-secondary-600, var(--accent-600, #9A7220))',
        },
        ink: {
          DEFAULT: 'var(--ink, #F4F6FA)',
          muted: 'var(--ink-muted, #A9B2C2)',
          faint: 'var(--ink-faint, #6B7588)',
        },
        blue: {
          50: '#eef4fc',
          100: '#d6e4f6',
          200: '#b3cce9',
          300: '#7DA6E8',
          400: '#5685DC',
          500: '#236CE1',
          600: '#1B56B8',
          700: '#184a98',
          800: '#163f7a',
          900: '#143460',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'card': 'var(--shadow-card, 0 1px 2px 0 rgba(0,0,0,0.36), 0 6px 16px -6px rgba(0,0,0,0.48))',
        'card-hover': 'var(--shadow-card-hover, 0 2px 6px 0 rgba(0,0,0,0.42), 0 12px 28px -8px rgba(0,0,0,0.56))',
        'gold': 'var(--shadow-accent, 0 6px 20px -4px rgba(184,138,42,0.40))',
        'nav-premium': '0 2px 8px -2px rgba(0,0,0,0.30), 0 12px 36px -8px rgba(0,0,0,0.52), 0 24px 56px -20px rgba(0,0,0,0.40)',
      },
      animation: {
        'slide-up': 'slide-up 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-soft': 'fade-in-soft 0.25s ease-out forwards',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-soft': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(5deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-3deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(184,138,42,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(184,138,42,0.6)' },
        },
      },
    },
  },
  plugins: [],
};
