import type { Target } from '@/types'

export function summarize(items: Pick<Target, 'status'>[]) {
  const total = items.length
  const completed = items.filter((i) => i.status === 'completed').length
  const inProgress = items.filter((i) => i.status === 'in_progress').length
  const percent = total ? Math.round((completed / total) * 1000) / 10 : 0
  return { total, completed, inProgress, notStarted: total - completed - inProgress, remaining: total - completed, percent }
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function ProgressCard({ items }: { items: Pick<Target, 'status'>[] }) {
  const s = summarize(items)
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Progress">
      <div className="mb-3 flex items-end justify-between">
        <p className="text-sm text-muted">
          <span className="text-3xl font-semibold text-fg">{s.completed}</span>
          <span className="text-lg text-fg"> / {s.total}</span> completed
        </p>
        <p className="text-xl font-semibold">{s.percent}%</p>
      </div>
      <ProgressBar percent={s.percent} />
      <p className="mt-3 text-xs text-muted">
        {s.total === 0
          ? 'Nothing recorded yet'
          : s.remaining === 0
            ? 'All done. Nice work.'
            : `${s.remaining} remaining · ${s.inProgress} in progress · ${s.notStarted} not started`}
      </p>
    </section>
  )
}
