'use client'

import { addDays, parseISO, today } from '@/lib/dates'

interface Day {
  total: number
  completed: number
}

/** Seven days of the selected week with per-day progress; tap one to open it. */
export function WeekStrip({
  weekStart,
  selected,
  days,
  onSelect,
}: {
  weekStart: string
  selected: string
  days: Record<string, Day | undefined>
  onSelect: (date: string) => void
}) {
  const now = today()
  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Days of the week">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        const d = days[date]
        const total = d?.total ?? 0
        const pct = total ? ((d?.completed ?? 0) / total) * 100 : 0
        const on = date === selected
        return (
          <button
            key={date}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(date)}
            className={`flex flex-col items-center rounded-xl border py-2 text-xs ${
              on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-line/50'
            }`}
          >
            <span className={date === now ? 'font-semibold text-accent' : 'text-muted'}>
              {parseISO(date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="text-base font-semibold">{parseISO(date).getDate()}</span>
            <span className="mt-1 h-1 w-6 overflow-hidden rounded-full bg-line">
              <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
            </span>
            <span className="mt-1 text-[10px] text-muted">{total ? `${d?.completed}/${total}` : '–'}</span>
          </button>
        )
      })}
    </div>
  )
}
