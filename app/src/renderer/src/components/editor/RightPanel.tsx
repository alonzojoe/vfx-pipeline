import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = { tab: string; onTab: (t: string) => void; chat: ReactNode; inspector: ReactNode }

export function RightPanel({ tab, onTab, chat, inspector }: Props): JSX.Element {
  return (
    <aside aria-label="Chat and inspector" className="flex w-[340px] shrink-0 flex-col border-l bg-panel">
      <Tabs value={tab} onValueChange={onTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-subtle p-2.5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="inspector">Inspector</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden" forceMount>
          {chat}
        </TabsContent>
        <TabsContent value="inspector" className="mt-0 min-h-0 flex-1">
          {inspector}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
