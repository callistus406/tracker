import { Suspense } from 'react'
import DailyView from '@/components/DailyView'

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading…</p>}>
      <DailyView />
    </Suspense>
  )
}
