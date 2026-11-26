import { AudioLines, Sparkle, type LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUsage } from '@/hooks/useUsage'
import { claudeMeter, elevenMeter, type Meter, type Tone } from '@/lib/usage'
import { cn } from '@/lib/utils'

/** Fill colour by what's left: plenty / under 25% / under 10%. */
// one shade deeper on light backgrounds so the colour still reads against white
const FILL: Record<Tone, string> = {
  ok: 'bg-emerald-600 dark:bg-emerald-500',
  low: 'bg-amber-500 dark:bg-amber-400',
  out: 'bg-red-600 dark:bg-red-500'
}

function Bar({ icon: Icon, name, meter, busy, onClick, iconClass }: {
  icon: LucideIcon
  name: string
  meter: Meter
  busy: boolean
  onClick: () => void
  iconClass?: string
}): JSX.Element {
  const left = meter.leftPct
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={busy}
          aria-label={`${name}: ${left == null ? 'unknown' : `${Math.round(left)}% left`} — check again`}
          className="flex h-6 items-center gap-1.5 rounded-md px-1.5 hover:bg-background disabled:cursor-wait"
        >
          <Icon className={cn('h-3.5 w-3.5 shrink-0', iconClass, left == null && !busy && 'opacity-40', busy && 'animate-pulse')} aria-hidden="true" />
          <span
            role="meter"
            aria-label={`${name} left`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={left == null ? undefined : Math.round(left)}
            className={cn('relative h-1.5 w-12 overflow-hidden rounded-full bg-foreground/15', left == null && 'bg-transparent outline-dashed outline-1 outline-border')}
          >
            {left != null && (
              <span className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', FILL[meter.tone])} style={{ width: `${Math.max(left, 3)}%` }} />
            )}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="whitespace-nowrap py-1.5 leading-relaxed">
        {(busy && left == null ? [meter.lines[0], 'Checking…'] : meter.lines).map((l, i) => (
          <div key={i} className={i === 0 ? 'font-semibold' : undefined}>
            {l}
          </div>
        ))}
        {!busy && <div className="opacity-60">Click to check again</div>}
      </TooltipContent>
    </Tooltip>
  )
}

/** What's left: ElevenLabs credits this cycle and Claude's plan limits. Icons + bars; the numbers are in the tooltips. */
export function UsageBars(): JSX.Element {
  const { usage, busy, refresh: onRefresh } = useUsage()
  return (
    <div aria-label="Usage left" className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg border border-input bg-surface-2 p-0.5">
      <Bar icon={AudioLines} name="ElevenLabs credits" meter={elevenMeter(usage.eleven)} busy={busy.eleven} onClick={() => onRefresh('eleven')} />
      <Bar icon={Sparkle} name="Claude plan" meter={claudeMeter(usage.claude)} busy={busy.claude} onClick={() => onRefresh('claude')} iconClass="text-[#d97757]" />
    </div>
  )
}
