import { Nav } from '@/components/Nav'
import { InstallButton } from '@/components/PwaSupport'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-line bg-surface p-4 md:flex">
        <p className="mb-6 px-3 text-lg font-semibold">Target Tracker</p>
        <Nav variant="sidebar" />
        <InstallButton className="mt-auto" />
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10">
        {children}
        <InstallButton className="mt-8 md:hidden" />
      </main>
      <Nav variant="tabs" />
    </div>
  )
}
