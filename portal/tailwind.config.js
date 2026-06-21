/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // High-contrast teen-friendly palette
        ink: '#0F0E17',
        paper: '#FFFFFE',
        cream: '#FFF8E7',
        sun:  '#FFC857',     // warm yellow accent
        flame:'#FF5E5B',     // coral accent
        sea:  '#00B2CA',     // teal accent
        leaf: '#7DCE82',     // green accent
        violet:'#A06CD5',    // purple accent
        sky:  '#7BC9FF',     // soft blue
      },
      boxShadow: {
        // chunky neo-brutalism shadows
        'pop':       '4px 4px 0 0 #0F0E17',
        'pop-lg':    '6px 6px 0 0 #0F0E17',
        'pop-xl':    '8px 8px 0 0 #0F0E17',
        'pop-sun':   '4px 4px 0 0 #FFC857',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop-in': 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-soft': 'bounceSoft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
