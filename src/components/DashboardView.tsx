'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, hasData, lastBackup } from '@/lib/api'
import { anyEnabled, loadSettings } from '@/lib/reminders'
import { currentWeekStart, formatLong, formatRange, today, weekEndOf, weekNumber } from '@/lib/dates'
import { useTargets, type TargetsApi } from '@/lib/useTargets'
import type { Target } from '@/types'
import { ProgressBar, summarize } from './Progress'
import { TargetCheck } from './TargetCheck'

function Card<T extends Target>({
  title,
  subtitle,
  t,
  href,
  cta,
  empty,
}: {
  title: string
  subtitle: string
  t: TargetsApi<T>
  href: string
  cta: string
  empty: string
}) {
  const s = summarize(t.items)
  const open = t.items.filter((i) => i.status !== 'completed')
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <p className="text-2xl font-semibold">{s.percent}%</p>
      </div>
      <div className="mt-3">
        <ProgressBar percent={s.percent} />
        <p className="mt-2 text-xs text-muted">
          {s.completed} of {s.total} completed · {s.remaining} remaining
        </p>
      </div>

      <div className="mt-4 flex-1">
        {t.loading ? (
          <div className="h-12 animate-pulse rounded-xl bg-line/60" />
        ) : t.error ? (
          <p className="text-sm text-danger">{t.error}</p>
        ) : s.total === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted">All done. Nice work.</p>
        ) : (
          <ul className="space-y-2.5">
            {open.slice(0, 4).map((i) => (
              <li key={i._id} className="flex items-center gap-3">
                <TargetCheck status={i.status} title={i.title} onToggle={() => t.setStatus(i._id, 'completed')} />
                <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
              </li>
            ))}
            {open.length > 4 && <li className="text-xs text-muted">+ {open.length - 4} more</li>}
          </ul>
        )}
      </div>

      <Link href={href} className="-mb-2 mt-2 inline-block self-start py-2 text-sm font-medium text-accent hover:underline">
        {cta} →
      </Link>
    </section>
  )
}

export default function DashboardView() {
  const date = today()
  const week = currentWeekStart()
  const daily = useTargets(api.daily, date)
  const weekly = useTargets(api.weekly, week)
  const hour = new Date().getHours()

  // Data lives only on this phone: gently remind to back up every couple of weeks.
  const [needsBackup, setNeedsBackup] = useState(false)
  useEffect(() => {
    const last = lastBackup()
    setNeedsBackup(hasData() && (!last || Date.now() - last > 14 * 86_400_000))
    try {
      setNudge(!anyEnabled(loadSettings()) && !localStorage.getItem('tt-nudge-reminders'))
    } catch {}
  }, [])
  const [nudge, setNudge] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{formatLong(date)}</p>
        <h1 className="text-2xl font-semibold">{hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}</h1>
      </div>
      {needsBackup && (
        <Link href="/settings#backup" className="flex items-center justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <span>Your data is only on this phone. Save a backup.</span>
          <span className="shrink-0 font-semibold">Back up →</span>
        </Link>
      )}
      {nudge && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <Link href="/settings#rem" className="flex-1 text-accent">
            <span className="font-semibold">Get reminders</span> for your day and week →
          </Link>
          <button
            aria-label="Dismiss"
            className="-m-2 p-2 text-muted"
            onClick={() => {
              setNudge(false)
              try {
                localStorage.setItem('tt-nudge-reminders', '1')
              } catch {}
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          title="Today"
          subtitle={formatLong(date)}
          t={daily}
          href="/daily"
          cta="Open Daily Targets"
          empty="No targets for today yet. Add one to get going."
        />
        <Card
          title={`Week ${weekNumber(week)}`}
          subtitle={formatRange(week, weekEndOf(week))}
          t={weekly}
          href="/weekly"
          cta="Open Weekly Targets"
          empty="No targets for this week yet."
        />
      </div>
    </div>
  )
}
