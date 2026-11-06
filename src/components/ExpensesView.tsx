'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { today, toISO } from '@/lib/dates'
import {
  addMonths,
  byCategory,
  byDay,
  csvOf,
  DEFAULT_SPEND,
  formatDay,
  formatMonth,
  loadSpend,
  money,
  monthBounds,
  monthKey,
  sumOf,
  type SpendSettings,
} from '@/lib/spend'
import { useExpenses } from '@/lib/useExpenses'
import { CATEGORY_LABEL, type Category, type Expense } from '@/types'
import { CategoryChips, ExpenseForm, parseAmount } from './ExpenseForm'
import { IconPlus } from './Icons'
import { PeriodNav } from './PeriodNav'
import { useToast } from './Toast'

const LAST_CATEGORY = 'tt-last-category'

export default function ExpensesView() {
  const toast = useToast()
  const [month, setMonth] = useState(() => monthKey(today()))
  const { from, to, days } = monthBounds(month)
  const t = useExpenses(from, to)
  const thisMonth = monthKey(today())

  const [cfg, setCfg] = useState<SpendSettings>(DEFAULT_SPEND)
  const [filter, setFilter] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)

  // Inline "add" form. The category sticks between entries because spending tends to come in runs.
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [date, setDate] = useState(today())
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setCfg(loadSpend())
    try {
      const c = localStorage.getItem(LAST_CATEGORY) as Category | null
      if (c && c in CATEGORY_LABEL) setCategory(c)
    } catch {}
  }, [])

  const fmt = (n: number) => money(n, cfg.currency)
  const total = sumOf(t.items)
  const cats = byCategory(t.items)
  const shown = filter ? t.items.filter((e) => e.category === filter) : t.items
  const groups = byDay(shown)

  const elapsed = month === thisMonth ? Number(today().slice(8)) : month < thisMonth ? days : 1
  const avg = month > thisMonth ? 0 : total / elapsed
  const left = cfg.budget - total
  const pct = cfg.budget > 0 ? Math.min(100, (total / cfg.budget) * 100) : 0

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!(n > 0)) return setFormError('Enter an amount greater than 0')
    setFormError(null)
    try {
      await t.add({ amount: n, category, note, date })
      try {
        localStorage.setItem(LAST_CATEGORY, category)
      } catch {}
      setAmount('')
      setNote('')
      if (monthKey(date) !== month) toast(`Added to ${formatMonth(monthKey(date))}`)
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  const remove = (id: string) => {
    const undo = t.softDelete(id)
    toast('Expense deleted', { action: { label: 'Undo', onClick: undo } })
  }

  const exportCsv = async () => {
    const all = await api.expenses.all()
    if (!all.length) return toast('Nothing to export yet.')
    const url = URL.createObjectURL(new Blob([csvOf(all)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${toISO(new Date())}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Exported ${all.length} expenses`)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">Expenses{month === thisMonth && ' · This month'}</p>
        <h1 className="text-2xl font-semibold">{formatMonth(month)}</h1>
      </div>

      <PeriodNav
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        onCurrent={() => setMonth(thisMonth)}
        currentLabel="This month"
        isCurrent={month === thisMonth}
        pickerLabel="Pick a month"
        pickerValue={`${month}-01`}
        onPick={(d) => setMonth(monthKey(d))}
      />

      {t.error && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          <span>{t.error}</span>
          <button onClick={t.reload} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Spending summary">
        <p className="text-sm text-muted">Spent</p>
        <p className="text-3xl font-semibold tabular-nums wrap-anywhere">{fmt(total)}</p>
        {cfg.budget > 0 ? (
          <div className="mt-3">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="Budget used"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={`h-full rounded-full transition-[width] duration-300 ${left < 0 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className={`mt-2 text-xs ${left < 0 ? 'font-medium text-danger' : 'text-muted'}`}>
              {left < 0 ? `${fmt(-left)} over` : `${fmt(left)} left`} of {fmt(cfg.budget)} budget
            </p>
          </div>
        ) : (
          <Link href="/settings#spending" className="mt-2 inline-block py-1 text-sm font-medium text-accent hover:underline">
            Set a monthly budget →
          </Link>
        )}
        <p className="mt-3 text-xs text-muted">
          {t.items.length} {t.items.length === 1 ? 'expense' : 'expenses'}
          {avg > 0 && ` · ${fmt(avg)} a day on average`}
        </p>
      </section>

      <form onSubmit={add} className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Add expense">
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Amount"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-xl font-semibold outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Date"
            className="w-36 shrink-0 rounded-xl border border-line bg-surface px-2.5 py-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <CategoryChips value={category} onChange={setCategory} />
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Note (optional)"
            aria-label="Note"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            aria-label="Add expense"
            disabled={!amount.trim()}
            className="flex items-center rounded-xl bg-accent px-4 text-accent-fg hover:opacity-90 disabled:opacity-40"
          >
            <IconPlus />
          </button>
        </div>
        {formError && <p className="text-sm text-danger" role="alert">{formError}</p>}
      </form>

      {cats.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4" aria-label="By category">
          <h2 className="mb-2 text-sm font-medium text-muted">By category</h2>
          <ul className="space-y-1">
            {cats.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setFilter(filter === c.id ? null : c.id)}
                  aria-pressed={filter === c.id}
                  className={`block w-full rounded-xl px-2 py-2 text-left ${filter === c.id ? 'bg-accent-soft' : 'hover:bg-line/40'}`}
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{CATEGORY_LABEL[c.id]}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {fmt(c.total)} · {Math.round((c.total / total) * 100)}%
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(c.total / cats[0].total) * 100}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {filter && (
            <button onClick={() => setFilter(null)} className="mt-2 py-1 text-sm font-medium text-accent hover:underline">
              Showing {CATEGORY_LABEL[filter]} only · Show all
            </button>
          )}
        </section>
      )}

      {t.loading ? (
        <ul className="space-y-2" aria-busy aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-2xl bg-line/60" />
          ))}
        </ul>
      ) : t.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-10 text-center">
          <p className="font-medium">No expenses in {formatMonth(month)}</p>
          <p className="mt-1 text-sm text-muted">Enter an amount above and tap +.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.date} aria-label={formatDay(g.date)}>
              <div className="mb-1.5 flex items-baseline justify-between px-1 text-sm">
                <h3 className="font-medium">{g.date === today() ? 'Today' : formatDay(g.date)}</h3>
                <span className="tabular-nums text-muted">{fmt(g.total)}</span>
              </div>
              <ul className="space-y-2">
                {g.items.map((e) => (
                  <li key={e._id}>
                    <button
                      onClick={() => setEditing(e)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left hover:border-accent"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden>
                        {CATEGORY_LABEL[e.category][0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{e.note || CATEGORY_LABEL[e.category]}</span>
                        <span className="block text-xs text-muted">{CATEGORY_LABEL[e.category]}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{fmt(e.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <button onClick={exportCsv} className="rounded-xl border border-line px-4 py-3 text-sm text-muted hover:bg-line/50">
        Export all as CSV
      </button>

      {editing && (
        <ExpenseForm
          expense={editing}
          onSubmit={(v) => t.edit(editing._id, v)}
          onDelete={() => remove(editing._id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
