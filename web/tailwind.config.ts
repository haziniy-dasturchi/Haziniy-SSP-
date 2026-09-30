import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A5D3A',
          hover: '#084A2E',
          active: '#063A24',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#2FBF71',
          soft: '#E9F7EF',
          'on-soft': '#0A5D3A',
        },
        neutral: {
          DEFAULT: '#F6F8F7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F1F4F2',
        },
        'on-surface': {
          DEFAULT: '#1B2420',
          muted: '#5F6E66',
        },
        border: {
          DEFAULT: '#E2E8E4',
          strong: '#C9D3CD',
        },
        status: {
          red: {
            DEFAULT: '#B33636',
            soft: '#FBE9E9',
          },
          amber: {
            DEFAULT: '#8A6100',
            fill: '#E0A100',
            soft: '#FFF4D6',
          },
          green: {
            DEFAULT: '#17703D',
            fill: '#1F9D55',
            soft: '#E3F5EA',
          },
        },
        chart: {
          plan: '#9AA8A0',
          fact: '#0A5D3A',
        },
        error: '#B33636',
        'focus-ring': '#2FBF71',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.45', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '1.2', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '1.2', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '1.2', letterSpacing: '0.04em', fontWeight: '600' }],
        'number-kpi': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
        'number-table': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        gutter: '24px',
        'page-margin-desktop': '32px',
        'page-margin-mobile': '16px',
        'sidebar-width': '248px',
        'sidebar-collapsed': '72px',
        'topbar-height': '64px',
        'bottom-nav-height': '64px',
        'content-max-width': '1440px',
        'tap-target': '44px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 20, 0.06)',
        dropdown: '0 8px 24px rgba(16, 24, 20, 0.12)',
        modal: '0 8px 24px rgba(16, 24, 20, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
