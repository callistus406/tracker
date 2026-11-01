import { Suspense } from 'react'
import WeeklyView from '@/components/WeeklyView'

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading…</p>}>
      <WeeklyView />
    </Suspense>
  )
}
