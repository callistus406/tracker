// Spending helpers: display settings (currency, monthly budget), month maths and totals.
import { parseISO, toISO } from './dates'
import type { Category, Expense } from '@/types'

export interface SpendSettings {
  currency: string
  /** Monthly budget in major units; 0 means no budget. */
  budget: number
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN', 'AED'] as const
export const DEFAULT_SPEND: SpendSettings = { currency: 'USD', budget: 0 }
const KEY = 'tt-spend-v1'

export function loadSpend(): SpendSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    return {
      currency: typeof s.currency === 'string' ? s.currency : DEFAULT_SPEND.currency,
      budget: Number.isFinite(s.budget) && s.budget > 0 ? s.budget : 0,
    }
  } catch {
    return DEFAULT_SPEND
  }
}

export function saveSpend(s: SpendSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

// ---- Months are "YYYY-MM" keys ----
export const monthKey = (iso: string) => iso.slice(0, 7)

export function monthBounds(key: string): { from: string; to: string; days: number } {
  const [y, m] = key.split('-').map(Number)
  const from = toISO(new Date(y, m - 1, 1))
  const to = toISO(new Date(y, m, 0))
  return { from, to, days: Number(to.slice(8)) }
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  return toISO(new Date(y, m - 1 + n, 1)).slice(0, 7)
}

export const formatMonth = (key: string) =>
  parseISO(`${key}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export const formatDay = (iso: string) =>
  parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export const sumOf = (items: Pick<Expense, 'amount'>[]) => Math.round(items.reduce((n, e) => n + e.amount, 0) * 100) / 100

export function byCategory(items: Expense[]): { id: Category; total: number }[] {
  const m = new Map<Category, number>()
  for (const e of items) m.set(e.category, (m.get(e.category) ?? 0) + e.amount)
  return [...m].map(([id, total]) => ({ id, total: Math.round(total * 100) / 100 })).sort((a, b) => b.total - a.total)
}

/** Items grouped by date, keeping the (newest-first) order they came in. */
export function byDay(items: Expense[]): { date: string; items: Expense[]; total: number }[] {
  const out: { date: string; items: Expense[]; total: number }[] = []
  for (const e of items) {
    const last = out[out.length - 1]
    if (last?.date === e.date) last.items.push(e)
    else out.push({ date: e.date, items: [e], total: 0 })
  }
  for (const g of out) g.total = sumOf(g.items)
  return out
}

export const csvOf = (items: Expense[]) =>
  ['date,category,note,amount', ...items.map((e) => [e.date, e.category, `"${e.note.replace(/"/g, '""')}"`, e.amount.toFixed(2)].join(','))].join('\n') + '\n'
