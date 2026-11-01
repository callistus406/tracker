'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, hasData, lastBackup } from '@/lib/api'
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
    <section className="flex flex-col rounded-2xl border border-line bg-surface p-5">
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

      <Link href={href} className="mt-4 text-sm font-medium text-accent hover:underline">
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
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{formatLong(date)}</p>
        <h1 className="text-2xl font-semibold">{hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}</h1>
      </div>
      {needsBackup && (
        <Link href="/history#backup" className="flex items-center justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <span>Your data is only on this phone. Save a backup.</span>
          <span className="shrink-0 font-semibold">Back up →</span>
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-2">
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
