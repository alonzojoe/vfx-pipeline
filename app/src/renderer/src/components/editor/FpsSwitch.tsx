import type { Fps } from '../../../../shared/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const OPTIONS: Fps[] = [30, 60]

/** 30 / 60 fps for Export — saved across restarts. 60 is smoother on fast motion, renders ~2× slower. */
export function FpsSwitch({ fps, onFps, disabled }: { fps: Fps; onFps: (f: Fps) => void; disabled?: boolean }): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div role="radiogroup" aria-label="Export frame rate" className="no-drag flex h-8 items-center gap-0.5 rounded-lg border border-input bg-surface-2 p-0.5">
          {OPTIONS.map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={fps === f}
              aria-label={`${f} fps`}
              disabled={disabled}
              onClick={() => onFps(f)}
              className={cn(
                'h-6 rounded-md px-2 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
                fps === f && 'bg-background text-foreground shadow-sm'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent>Export frame rate (fps) — 60 is smoother, renders about 2× slower</TooltipContent>
    </Tooltip>
  )
}
