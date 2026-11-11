import { Monitor, Moon, Sun } from 'lucide-react'
import type { ThemeSource } from '../../../../shared/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemeSource; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Match macOS', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
]

/** System / Light / Dark — saved across restarts, applied before the window paints (no flash). */
export function ThemeSwitch(): JSX.Element {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label="Appearance" className="no-drag flex h-8 items-center gap-0.5 rounded-lg border border-input bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = theme?.source === value
        return (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                role="radio"
                aria-checked={on}
                aria-label={label}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex h-6 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground',
                  on && 'bg-background text-foreground shadow-sm'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
