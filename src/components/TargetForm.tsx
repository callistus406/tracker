'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatRange, formatShort, weekEndOf, weekNumber, weekStartOf } from '@/lib/dates'
import type { Status, Target } from '@/types'
import { StatusControl } from './StatusControl'

export interface FormValues {
  title: string
  description: string
  status: Status
  /** Day (YYYY-MM-DD) or week start the target belongs to. */
  period: string
}

interface Props {
  noun: 'day' | 'week'
  periodKey: string
  initial?: Target
  initialTitle?: string
  onSubmit: (v: FormValues) => Promise<void>
  onClose: () => void
}

const field =
  'mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'

export function TargetForm({ noun, periodKey, initial, initialTitle, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? initialTitle ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Status>(initial?.status ?? 'not_started')
  const [date, setDate] = useState(periodKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const period = noun === 'week' ? weekStartOf(date) : date

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Give the target a title')
    if (!date) return setError(`Pick a ${noun}`)
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), status, period })
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit target' : 'New target'}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
      >
        <h2 className="mb-4 text-lg font-semibold">{initial ? 'Edit target' : 'New target'}</h2>

        <label className="mb-4 block text-sm font-medium">
          Title
          <input ref={titleRef} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>

        <label className="mb-4 block text-sm font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
          <textarea value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} className={field} />
        </label>

        <div className="mb-4 text-sm font-medium">
          Status
          <div className="mt-1"><StatusControl value={status} onChange={setStatus} /></div>
        </div>

        <label className="mb-5 block text-sm font-medium">
          {noun === 'day' ? 'Day' : 'Week (pick any date in it)'}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          <span className="mt-1 block text-xs font-normal text-muted">
            {date &&
              (noun === 'day'
                ? formatShort(date)
                : `Week ${weekNumber(period)} · ${formatRange(period, weekEndOf(period))}`)}
            {date && period !== periodKey && ' · will move out of this ' + noun}
          </span>
        </label>

        {error && <p className="mb-3 text-sm text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:bg-line/50">
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
