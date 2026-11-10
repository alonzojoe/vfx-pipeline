import { TooltipProvider } from '@/components/ui/tooltip'
import { TitleBar } from '@/components/editor/TitleBar'

export default function App(): JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        <TitleBar
          project="business-terms"
          projects={['business-terms']}
          branch="develop"
          status={{ voice: false, build: true, render: false }}
          onProject={() => {}}
          onReview={() => {}}
          onMake={() => {}}
        />
        <div className="flex min-h-0 flex-1">
          <aside className="w-[280px] shrink-0 border-r bg-panel" aria-label="Media" />
          <main className="flex min-w-0 flex-1 flex-col bg-background" aria-label="Preview" />
          <aside className="w-[340px] shrink-0 border-l bg-panel" aria-label="Chat and inspector" />
        </div>
        <section className="h-[300px] shrink-0 border-t bg-panel" aria-label="Timeline" />
      </div>
    </TooltipProvider>
  )
}
