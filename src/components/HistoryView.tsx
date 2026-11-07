'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProgressBar } from '@/components/Progress'
import { api } from '@/lib/api'
import { addDays, currentWeekStart, formatRange, formatShort, today, weekEndOf, weekNumber } from '@/lib/dates'
import type { Summary } from '@/types'

type Tab = 'daily' | 'weekly'

const pct = (done: number, total: number) => (total ? `${Math.round((done / total) * 100)}%` : '–')
const sum = (rows: Summary[]) => ({
  done: rows.reduce((n, r) => n + r.completed, 0),
  total: rows.reduce((n, r) => n + r.total, 0),
})

/** Small at-a-glance numbers; daily and weekly records are never mixed. */
function stats(tab: Tab, rows: Summary[]): [string, string][] {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const full = (r?: Summary) => !!r && r.total > 0 && r.completed === r.total
  const all = sum(rows)
  if (tab === 'daily') {
    // Consecutive days with every target completed; a day still in progress doesn't break the streak.
    let d = today()
    if (!full(byKey.get(d))) d = addDays(d, -1)
    let streak = 0
    for (; full(byKey.get(d)); d = addDays(d, -1)) streak++
    const week = sum(rows.filter((r) => r.key >= addDays(today(), -6)))
    return [['Day streak', String(streak)], ['Last 7 days', pct(week.done, week.total)], ['Completed', String(all.done)]]
  }
  const recent = sum(rows.filter((r) => r.key >= addDays(currentWeekStart(), -21)))
  return [
    ['Weeks fully done', String(rows.filter(full).length)],
    ['Last 4 weeks', pct(recent.done, recent.total)],
    ['Completed', String(all.done)],
  ]
}

export default function HistoryView() {
  const [tab, setTab] = useState<Tab>('daily')
  const [rows, setRows] = useState<Summary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    setError(null)
    api.history[tab]().then(setRows).catch((e: Error) => setError(e.message))
  }, [tab])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      <div className="flex rounded-xl border border-line bg-surface p-0.5 text-sm sm:inline-flex">
        {(['daily', 'weekly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 sm:flex-none sm:px-5 ${tab === t ? 'bg-accent font-medium text-accent-fg' : 'text-muted hover:bg-line/50'}`}
          >
            {t === 'daily' ? 'Daily' : 'Weekly'}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      {!rows && !error && <p className="py-10 text-center text-sm text-muted">Loading…</p>}
      {rows && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats(tab, rows).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-surface px-3 py-3 text-center">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}
      {rows?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line py-10 text-center text-muted">
          No {tab} records yet.
        </p>
      )}
      <ul className="space-y-2">
        {rows?.map((r) => (
          <li key={r.key}>
            <Link
              href={tab === 'daily' ? `/daily?date=${r.key}` : `/weekly?week=${r.key}`}
              className="block rounded-2xl border border-line bg-surface p-4 hover:border-accent"
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  {tab === 'daily'
                    ? formatShort(r.key)
                    : `Week ${weekNumber(r.key)} · ${formatRange(r.key, weekEndOf(r.key))}`}
                </p>
                <p className="shrink-0 text-sm font-semibold">{r.percent}%</p>
              </div>
              <ProgressBar percent={r.percent} />
              <p className="mt-2 text-xs text-muted">
                {r.completed} of {r.total} completed · {r.remaining} remaining
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
