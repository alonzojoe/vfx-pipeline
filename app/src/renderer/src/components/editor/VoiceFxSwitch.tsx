import { Mic } from 'lucide-react'
import type { VoiceFx } from '../../../../shared/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const OPTIONS: { value: VoiceFx; label: string; about: string }[] = [
  { value: 'warm', label: 'Warm', about: 'Natural warmth — fuller, smooth, friendly (default)' },
  { value: 'clear', label: 'Clear', about: 'Natural clarity — crisp words, tone untouched' },
  { value: 'off', label: 'Raw', about: 'The ElevenLabs voice as it comes' }
]

/** Voice enhancer preset for every reel — saved in brand.json; changing it re-processes the open reel for free. */
export function VoiceFxSwitch({ value, onChange, disabled }: { value: VoiceFx; onChange: (fx: VoiceFx) => void; disabled?: boolean }): JSX.Element {
  return (
    <div role="radiogroup" aria-label="Voice sound" className="no-drag flex h-8 items-center gap-0.5 rounded-lg border border-input bg-surface-2 p-0.5">
      <Mic className="mx-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      {OPTIONS.map((o) => (
        <Tooltip key={o.value}>
          <TooltipTrigger asChild>
            <button
              role="radio"
              aria-checked={value === o.value}
              aria-label={`${o.label} voice`}
              disabled={disabled}
              onClick={() => value !== o.value && onChange(o.value)}
              className={cn(
                'h-6 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
                value === o.value && 'bg-background text-foreground shadow-sm'
              )}
            >
              {o.label}
            </button>
          </TooltipTrigger>
          <TooltipContent>{o.about}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
