'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ExpenseInput } from '@/lib/api'
import { CATEGORIES, type Expense } from '@/types'

const field =
  'mt-1 w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-3 text-base font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'

/** Parses "12.50" or "12,50"; returns NaN for anything else. */
export const parseAmount = (s: string) => (/^\s*\d*[.,]?\d{0,2}\s*$/.test(s) && s.trim() ? Number(s.trim().replace(',', '.')) : NaN)

export function CategoryChips({ value, onChange }: { value: ExpenseInput['category']; onChange: (c: ExpenseInput['category']) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className={`rounded-full px-3.5 py-2 text-sm ${value === c.id ? 'bg-accent font-medium text-accent-fg' : 'border border-line text-muted hover:bg-line/50'}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

interface Props {
  expense: Expense
  onSubmit: (v: ExpenseInput) => Promise<void>
  onDelete: () => void
  onClose: () => void
}

/** Edit dialog for one expense (adding is done inline on the page). */
export function ExpenseForm({ expense, onSubmit, onDelete, onClose }: Props) {
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState(expense.category)
  const [note, setNote] = useState(expense.note)
  const [date, setDate] = useState(expense.date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!(n > 0)) return setError('Enter an amount greater than 0')
    if (!date) return setError('Pick a date')
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ amount: n, category, note, date })
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
        aria-label="Edit expense"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
      >
        <h2 className="mb-4 text-lg font-semibold">Edit expense</h2>

        <label className="mb-4 block text-sm font-medium">
          Amount
          <input ref={ref} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        </label>

        <div className="mb-4 text-sm font-medium">
          Category
          <div className="mt-1.5"><CategoryChips value={category} onChange={setCategory} /></div>
        </div>

        <label className="mb-4 block text-sm font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={field} />
        </label>

        <label className="mb-5 block text-sm font-medium">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>

        {error && <p className="mb-3 text-sm text-danger" role="alert">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              onDelete()
            }}
            className="mr-auto rounded-xl px-3 py-3 text-sm text-danger hover:bg-danger/10"
          >
            Delete
          </button>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm text-muted hover:bg-line/50">
            Cancel
          </button>
          <button disabled={saving} className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
