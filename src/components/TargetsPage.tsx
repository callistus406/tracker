'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type TouchEvent } from 'react'
import { addDays, formatRange, formatShort, weekEndOf } from '@/lib/dates'
import type { Adapter, TargetsApi } from '@/lib/useTargets'
import type { Target } from '@/types'
import { IconPlus } from './Icons'
import { ProgressCard } from './Progress'
import { TargetForm, type FormValues } from './TargetForm'
import { TargetItem } from './TargetItem'
import { useToast } from './Toast'

type Filter = 'all' | 'todo' | 'done'

interface Props<T extends Target> {
  t: TargetsApi<T>
  adapter: Adapter<T>
  periodKey: string
  noun: 'day' | 'week'
  heading: ReactNode
  nav: ReactNode
  strip?: ReactNode
  /** Called on a horizontal swipe: -1 = previous, 1 = next. */
  onStep: (dir: -1 | 1) => void
}

/** Shared list + progress UI. Daily and weekly pages each feed it their own data source. */
export function TargetsPage<T extends Target>({ t, adapter, periodKey, noun, heading, nav, strip, onStep }: Props<T>) {
  const toast = useToast()
  const [form, setForm] = useState<{ target?: T; title?: string } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [quick, setQuick] = useState('')
  const touch = useRef<{ x: number; y: number } | null>(null)

  const step = noun === 'day' ? 1 : 7
  const nextKey = addDays(periodKey, step)
  const label = (k: string) => (noun === 'day' ? formatShort(k) : formatRange(k, weekEndOf(k)))
  const moveLabel = noun === 'day' ? 'Move to tomorrow' : 'Move to next week'

  // Unfinished targets from the previous day/week can be copied over on request (never automatically).
  const prevKey = addDays(periodKey, -step)
  const [prev, setPrev] = useState<T[]>([])
  useEffect(() => {
    let stale = false
    setPrev([])
    adapter.list(prevKey).then((r) => !stale && setPrev(r)).catch(() => {})
    return () => {
      stale = true
    }
  }, [adapter, prevKey])
  const have = new Set(t.items.map((i) => i.title.trim().toLowerCase()))
  const carry = prev.filter((i) => i.status !== 'completed' && !have.has(i.title.trim().toLowerCase()))
  const bringOver = async () => {
    const batch = carry
    try {
      for (const i of batch) await t.add({ title: i.title, description: i.description })
      toast(`Copied ${batch.length} unfinished ${batch.length === 1 ? 'target' : 'targets'}`)
    } catch (e) {
      t.setError((e as Error).message)
    }
  }

  const todo = t.items.filter((i) => i.status !== 'completed')
  const done = t.items.length - todo.length
  const shown = filter === 'all' ? t.items : filter === 'todo' ? todo : t.items.filter((i) => i.status === 'completed')

  const quickAdd = async (e: FormEvent) => {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    setQuick('')
    try {
      await t.add({ title, description: '' })
    } catch (err) {
      setQuick(title)
      t.setError((err as Error).message)
    }
  }

  const save = async (v: FormValues) => {
    const { period, ...rest } = v
    if (form?.target) {
      await t.edit(form.target._id, { ...rest, ...(period !== periodKey && { period }) })
      if (period !== periodKey) toast(`Moved to ${label(period)}`)
    } else {
      await t.add(rest, period)
      if (period !== periodKey) toast(`Added to ${label(period)}`)
    }
  }

  const move = async (id: string) => {
    try {
      await t.edit(id, { period: nextKey })
      toast(`Moved to ${label(nextKey)}`)
    } catch (e) {
      t.setError((e as Error).message)
    }
  }

  const remove = (id: string) => {
    const undo = t.softDelete(id)
    toast('Target deleted', { action: { label: 'Undo', onClick: undo } })
  }

  // Swipe sideways to step to the previous/next day or week.
  const onTouchStart = (e: TouchEvent) => {
    const p = e.touches[0]
    touch.current = { x: p.clientX, y: p.clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s || form) return
    const p = e.changedTouches[0]
    const dx = p.clientX - s.x
    if (Math.abs(dx) > 90 && Math.abs(p.clientY - s.y) < 50) onStep(dx > 0 ? -1 : 1)
  }

  const tab = (f: Filter, text: string, n: number) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      aria-pressed={filter === f}
      className={`rounded-full px-3 py-1 text-sm ${filter === f ? 'bg-fg font-medium text-page' : 'text-muted hover:bg-line/50'}`}
    >
      {text} <span className="opacity-70">{n}</span>
    </button>
  )

  return (
    <div className="space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {heading}
      {nav}
      {strip}

      {t.error && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          <span>{t.error}</span>
          <button onClick={t.reload} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      <ProgressCard items={t.items} />

      {!t.loading && carry.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <span>
            {carry.length} unfinished from {noun === 'day' ? 'the day before' : 'last week'}
          </span>
          <button onClick={bringOver} className="shrink-0 font-semibold text-accent hover:underline">
            Copy over
          </button>
        </div>
      )}

      <form onSubmit={quickAdd} className="flex gap-2">
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          maxLength={200}
          placeholder={`Add a target for this ${noun}…`}
          aria-label="New target title"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={() => setForm({ title: quick.trim() })}
          className="rounded-xl border border-line bg-surface px-3 text-sm text-muted hover:bg-line/50"
          title="Add with a note, status or different date"
        >
          Details
        </button>
        <button
          aria-label="Add target"
          disabled={!quick.trim()}
          className="flex items-center rounded-xl bg-accent px-3.5 text-accent-fg hover:opacity-90 disabled:opacity-40"
        >
          <IconPlus />
        </button>
      </form>

      {t.items.length > 0 && (
        <div className="flex gap-1">
          {tab('all', 'All', t.items.length)}
          {tab('todo', 'To do', todo.length)}
          {tab('done', 'Done', done)}
        </div>
      )}

      {t.loading ? (
        <ul className="space-y-2" aria-busy aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-line/60" />
          ))}
        </ul>
      ) : t.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center">
          <p className="font-medium">Nothing planned for this {noun}</p>
          <p className="mt-1 text-sm text-muted">Type a target above and press Enter.</p>
          <button onClick={() => setForm({})} className="mt-3 text-sm font-medium text-accent hover:underline">
            Or add one with details
          </button>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {filter === 'todo' ? 'Everything is done.' : 'Nothing completed yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <TargetItem
              key={item._id}
              item={item}
              moveLabel={moveLabel}
              onToggle={() => t.setStatus(item._id, item.status === 'completed' ? 'not_started' : 'completed')}
              onStart={() => t.setStatus(item._id, 'in_progress')}
              onEdit={() => setForm({ target: item })}
              onMove={() => move(item._id)}
              onDelete={() => remove(item._id)}
            />
          ))}
        </ul>
      )}

      {form && (
        <TargetForm
          noun={noun}
          periodKey={periodKey}
          initial={form.target}
          initialTitle={form.title}
          onSubmit={async (v) => {
            await save(v)
            if (!form.target) setQuick('')
          }}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
