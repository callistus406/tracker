'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { addDays, currentWeekStart, formatRange, isValidISO, weekEndOf, weekNumber, weekStartOf } from '@/lib/dates'
import { useTargets } from '@/lib/useTargets'
import { PeriodNav } from './PeriodNav'
import { TargetsPage } from './TargetsPage'

export default function WeeklyView() {
  const pathname = usePathname()
  const raw = useSearchParams().get('week')
  // Any date inside a week resolves to that week's Monday.
  const start = isValidISO(raw) ? weekStartOf(raw) : currentWeekStart()
  const go = (d: string) => {
    const s = weekStartOf(d)
    window.history.pushState(null, '', s === currentWeekStart() ? pathname : `${pathname}?week=${s}`)
  }
  const t = useTargets(api.weekly, start)

  return (
    <TargetsPage
      t={t}
      adapter={api.weekly}
      periodKey={start}
      noun="week"
      onStep={(dir) => go(addDays(start, dir * 7))}
      heading={
        <div>
          <p className="text-sm text-muted">Weekly targets{start === currentWeekStart() && ' · This week'}</p>
          <h1 className="text-2xl font-semibold">Week {weekNumber(start)}</h1>
          <p className="text-muted">{formatRange(start, weekEndOf(start))}</p>
        </div>
      }
      nav={
        <PeriodNav
          onPrev={() => go(addDays(start, -7))}
          onNext={() => go(addDays(start, 7))}
          onCurrent={() => go(currentWeekStart())}
          currentLabel="This week"
          isCurrent={start === currentWeekStart()}
          pickerLabel="Pick any date in a week"
          pickerValue={start}
          onPick={go}
        />
      }
    />
  )
}
