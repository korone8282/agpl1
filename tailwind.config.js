/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px (was 10px, +2px)
        xs: ['0.875rem', { lineHeight: '1.25rem' }],       // 14px (was 12px, +2px)
        sm: ['1rem', { lineHeight: '1.5rem' }],            // 16px (was 14px, +2px)
        base: ['1.125rem', { lineHeight: '1.75rem' }],     // 18px (was 16px, +2px)
        lg: ['1.25rem', { lineHeight: '1.75rem' }],        // 20px (was 18px, +2px)
        xl: ['1.375rem', { lineHeight: '1.875rem' }],      // 22px (was 20px, +2px)
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }],   // 26px (was 24px, +2px)
        '3xl': ['2rem', { lineHeight: '2.375rem' }],       // 32px (was 30px, +2px)
      },
      gridTemplateColumns: {
        20: "repeat(20, minmax(0, 1fr))",
      },
      backgroundImage: {
        'hero': "url('../public/images/123.jpeg')",
        'zero': "url('../public/images/dark.png')",
        'a': "url('../public/images/kk.jpg')",
        'b': "url('../public/images/ngng.jpg')",
        'c': "url('../public/images/yoyo.jpg')",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#FF9F0A",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1C1C1E",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#FF453A",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#2C2C2E",
          foreground: "#8E8E93",
        },
        accent: {
          DEFAULT: "#30D158",
          foreground: "#000000",
        },
      },
    },
    keyframes: {
        "fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        spin_right: {
            '0%': { transform: 'rotate(0deg)' },
            '50%': { transform: 'rotate(180deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
          spin_left: {
            '0%': { transform: 'rotate(0deg)' },
            '50%': { transform: 'rotate(-180deg)' },
            '100%': { transform: 'rotate(-360deg)' },
          },
          tilt: {
            '0%, 50%, 100%': { transform: 'rotate(0deg)' },
            '25%': { transform: 'rotate(1.5deg)' },
            '75%': { transform: 'rotate(-1.5deg)' },
          },
      },
      animation: {
        "fade-up": "fade-up 1s ease-in-out",
        "fade-in": "fade-in 1s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "spin_right": 'spin_right 3s linear infinite',
        "spin_right_fast": 'spin_right 2s linear infinite',
        "spin_left": 'spin_left 3s linear infinite',
        "tilt": 'tilt 3s linear infinite'
      },
  },
  plugins: [],
}