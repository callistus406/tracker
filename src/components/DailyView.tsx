'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { addDays, formatLong, isValidISO, today, weekStartOf } from '@/lib/dates'
import { useTargets } from '@/lib/useTargets'
import { summarize } from './Progress'
import { PeriodNav } from './PeriodNav'
import { TargetsPage } from './TargetsPage'
import { WeekStrip } from './WeekStrip'

export default function DailyView() {
  const pathname = usePathname()
  const raw = useSearchParams().get('date')
  const date = isValidISO(raw) ? raw : today()
  // pushState (which Next syncs into useSearchParams) switches days instantly; router.push would fetch from the network.
  const go = (d: string) => window.history.pushState(null, '', d === today() ? pathname : `${pathname}?date=${d}`)

  const t = useTargets(api.daily, date)

  // Per-day totals for the week strip; the open day is computed live from the list.
  const weekStart = weekStartOf(date)
  const [week, setWeek] = useState<Record<string, { total: number; completed: number }>>({})
  const count = t.items.length
  useEffect(() => {
    api.history
      .daily(weekStart, addDays(weekStart, 6))
      .then((rows) => setWeek(Object.fromEntries(rows.map((r) => [r.key, r]))))
      .catch(() => {})
  }, [weekStart, count])
  const live = summarize(t.items)

  return (
    <TargetsPage
      t={t}
      adapter={api.daily}
      periodKey={date}
      noun="day"
      onStep={(dir) => go(addDays(date, dir))}
      heading={
        <div>
          <p className="text-sm text-muted">Daily targets{date === today() && ' · Today'}</p>
          <h1 className="text-2xl font-semibold">{formatLong(date)}</h1>
        </div>
      }
      nav={
        <PeriodNav
          onPrev={() => go(addDays(date, -1))}
          onNext={() => go(addDays(date, 1))}
          onCurrent={() => go(today())}
          currentLabel="Today"
          isCurrent={date === today()}
          pickerLabel="Pick a date"
          pickerValue={date}
          onPick={go}
        />
      }
      strip={
        <WeekStrip
          weekStart={weekStart}
          selected={date}
          days={{ ...week, [date]: { total: live.total, completed: live.completed } }}
          onSelect={go}
        />
      }
    />
  )
}
