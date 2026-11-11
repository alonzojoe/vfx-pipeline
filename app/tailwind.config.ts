import path from 'node:path'
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: 'class', // html.dark is set by the preload from the saved System / Light / Dark choice
  content: [path.join(__dirname, 'src/renderer/index.html'), path.join(__dirname, 'src/renderer/src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        panel: 'hsl(var(--panel))',
        titlebar: 'hsl(var(--titlebar))',
        surface: { DEFAULT: 'hsl(var(--surface))', 2: 'hsl(var(--surface-2))', 3: 'hsl(var(--surface-3))' },
        subtle: 'hsl(var(--subtle))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        track: {
          captions: 'var(--track-captions)',
          cards: 'var(--track-cards)',
          avatar: 'var(--track-avatar)',
          fx: 'var(--track-fx)',
          voice: 'var(--track-voice)',
          sfx: 'var(--track-sfx)',
          bg: 'var(--track-bg)',
          media: 'var(--track-media)'
        }
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'monospace']
      }
    }
  },
  plugins: [animate]
} satisfies Config
