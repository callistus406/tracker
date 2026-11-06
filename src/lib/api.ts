// On-device data layer. Everything is stored in this browser's localStorage, so the app needs no
// server or database and the data never leaves the phone. Same async shape the UI already uses.
import type { Category, DailyTarget, Expense, Status, Summary, WeeklyTarget } from '@/types'
import { CATEGORIES, STATUSES } from '@/types'
import { addDays, isValidISO, parseISO, weekEndOf } from './dates'

export interface TargetInput {
  title: string
  description: string
  status?: Status
  /** Daily only: "HH:MM" reminder time; empty string or null clears it. */
  remindAt?: string | null
}
/** `period` moves the target to another day (daily) or week start (weekly). */
export type UpdateInput = Partial<TargetInput> & { period?: string }

type Collection = 'daily' | 'weekly'
interface DB {
  daily: DailyTarget[]
  weekly: WeeklyTarget[]
  expenses: Expense[]
}

const KEY = 'tt-data-v1'
const BACKUP_KEY = 'tt-last-backup'

function readDB(): DB {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? '')
    return {
      daily: Array.isArray(d.daily) ? d.daily : [],
      weekly: Array.isArray(d.weekly) ? d.weekly : [],
      expenses: Array.isArray(d.expenses) ? d.expenses : [],
    }
  } catch {
    return { daily: [], weekly: [], expenses: [] }
  }
}

function writeDB(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    throw new Error('Could not save: this device is out of storage.')
  }
}

/** Raw copy of everything stored on this device (used by reminders). */
export const snapshot = (): DB => readDB()

const isMonday = (s: string) => parseISO(s).getDay() === 1

function check(c: Collection, v: Partial<TargetInput>, period?: string) {
  if (v.title !== undefined && (!v.title.trim() || v.title.trim().length > 200)) throw new Error('Title must be 1–200 characters')
  if (v.description !== undefined && v.description.trim().length > 1000) throw new Error('Note is too long (max 1000 characters)')
  if (v.status !== undefined && !STATUSES.includes(v.status)) throw new Error('Invalid status')
  if (v.remindAt && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.remindAt)) throw new Error('Invalid reminder time')
  if (period !== undefined) {
    if (!isValidISO(period)) throw new Error('Invalid date')
    if (c === 'weekly' && !isMonday(period)) throw new Error('A week must start on a Monday')
  }
}

const field = (c: Collection) => (c === 'daily' ? 'date' : 'weekStartDate')
const periodOf = (c: Collection, t: DailyTarget | WeeklyTarget) =>
  c === 'daily' ? (t as DailyTarget).date : (t as WeeklyTarget).weekStartDate

function collection<T extends DailyTarget | WeeklyTarget>(c: Collection) {
  const list = (db: DB) => db[c] as unknown as T[]
  return {
    list: async (key: string): Promise<T[]> => list(readDB()).filter((t) => periodOf(c, t) === key),

    create: async (key: string, v: TargetInput): Promise<T> => {
      check(c, v, key)
      const now = new Date().toISOString()
      const t = {
        _id: crypto.randomUUID(),
        title: v.title.trim(),
        description: (v.description ?? '').trim(),
        status: v.status ?? 'not_started',
        createdAt: now,
        updatedAt: now,
        ...(c === 'daily' ? { date: key, ...(v.remindAt && { remindAt: v.remindAt }) } : { weekStartDate: key, weekEndDate: weekEndOf(key) }),
      } as unknown as T
      const db = readDB()
      list(db).push(t)
      writeDB(db)
      return t
    },

    update: async (id: string, { period, ...v }: UpdateInput): Promise<T> => {
      check(c, v, period)
      const db = readDB()
      const t = list(db).find((x) => x._id === id)
      if (!t) throw new Error('Target not found')
      if (v.title !== undefined) t.title = v.title.trim()
      if (v.description !== undefined) t.description = v.description.trim()
      if (v.status !== undefined) t.status = v.status
      if (c === 'daily' && v.remindAt !== undefined) {
        if (v.remindAt) (t as DailyTarget).remindAt = v.remindAt
        else delete (t as DailyTarget).remindAt
      }
      if (period) {
        ;(t as unknown as Record<string, string>)[field(c)] = period
        if (c === 'weekly') (t as WeeklyTarget).weekEndDate = weekEndOf(period)
      }
      t.updatedAt = new Date().toISOString()
      writeDB(db)
      return t
    },

    remove: async (id: string): Promise<void> => {
      const db = readDB()
      db[c] = list(db).filter((x) => x._id !== id) as never
      writeDB(db)
    },
  }
}

function summarize(c: Collection, filter: (key: string) => boolean = () => true): Summary[] {
  const groups = new Map<string, Summary>()
  for (const t of readDB()[c] as (DailyTarget | WeeklyTarget)[]) {
    const key = periodOf(c, t)
    if (!filter(key)) continue
    const g = groups.get(key) ?? { key, total: 0, completed: 0, inProgress: 0, remaining: 0, percent: 0 }
    g.total++
    if (t.status === 'completed') g.completed++
    if (t.status === 'in_progress') g.inProgress++
    groups.set(key, g)
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      remaining: g.total - g.completed,
      percent: g.total ? Math.round((g.completed / g.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
}

// ---- Expenses ----

export interface ExpenseInput {
  amount: number
  category: Category
  note: string
  date: string
}

const CATEGORY_IDS: string[] = CATEGORIES.map((c) => c.id)
const round2 = (n: number) => Math.round(n * 100) / 100

function checkExpense(v: Partial<ExpenseInput>) {
  if (v.amount !== undefined && (!Number.isFinite(v.amount) || v.amount <= 0 || v.amount > 1e9)) throw new Error('Enter an amount greater than 0')
  if (v.category !== undefined && !CATEGORY_IDS.includes(v.category)) throw new Error('Invalid category')
  if (v.note !== undefined && v.note.trim().length > 200) throw new Error('Note is too long (max 200 characters)')
  if (v.date !== undefined && !isValidISO(v.date)) throw new Error('Invalid date')
}

const newestFirst = (a: Expense, b: Expense) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

const expenses = {
  /** Expenses dated from..to (inclusive), newest first. */
  list: async (from: string, to: string): Promise<Expense[]> =>
    readDB().expenses.filter((e) => e.date >= from && e.date <= to).sort(newestFirst),

  create: async (v: ExpenseInput): Promise<Expense> => {
    checkExpense(v)
    const now = new Date().toISOString()
    const e: Expense = {
      _id: crypto.randomUUID(),
      amount: round2(v.amount),
      category: v.category,
      note: (v.note ?? '').trim(),
      date: v.date,
      createdAt: now,
      updatedAt: now,
    }
    const db = readDB()
    db.expenses.push(e)
    writeDB(db)
    return e
  },

  update: async (id: string, v: Partial<ExpenseInput>): Promise<Expense> => {
    checkExpense(v)
    const db = readDB()
    const e = db.expenses.find((x) => x._id === id)
    if (!e) throw new Error('Expense not found')
    if (v.amount !== undefined) e.amount = round2(v.amount)
    if (v.category !== undefined) e.category = v.category
    if (v.note !== undefined) e.note = v.note.trim()
    if (v.date !== undefined) e.date = v.date
    e.updatedAt = new Date().toISOString()
    writeDB(db)
    return e
  },

  remove: async (id: string): Promise<void> => {
    const db = readDB()
    db.expenses = db.expenses.filter((x) => x._id !== id)
    writeDB(db)
  },

  all: async (): Promise<Expense[]> => readDB().expenses.sort(newestFirst),
}

export const api = {
  expenses,
  daily: collection<DailyTarget>('daily'),
  weekly: collection<WeeklyTarget>('weekly'),
  history: {
    daily: async (from?: string, to?: string) =>
      summarize('daily', (k) => (!from || k >= from) && (!to || k <= to)),
    weekly: async () => summarize('weekly'),
  },
}

// ---- Backup / restore ----

export interface BackupInfo {
  daily: number
  weekly: number
  expenses: number
}

export function exportData(): { json: string; counts: BackupInfo } {
  const db = readDB()
  const json = JSON.stringify({ app: 'target-tracker', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2)
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()))
  } catch {}
  return { json, counts: { daily: db.daily.length, weekly: db.weekly.length, expenses: db.expenses.length } }
}

export const lastBackup = (): number | null => {
  const n = Number(localStorage.getItem(BACKUP_KEY))
  return n || null
}

export const hasData = () => {
  const db = readDB()
  return db.daily.length + db.weekly.length + db.expenses.length > 0
}

/** Merges a backup file into the data on this device (same id = backup wins). */
export function importData(text: string): BackupInfo {
  let parsed: { daily?: unknown; weekly?: unknown; expenses?: unknown }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not a valid backup.')
  }
  const okBase = (t: Record<string, unknown>) =>
    typeof t._id === 'string' && typeof t.title === 'string' && t.title.trim() && STATUSES.includes(t.status as Status)
  const daily = (Array.isArray(parsed.daily) ? parsed.daily : []) as DailyTarget[]
  const weekly = (Array.isArray(parsed.weekly) ? parsed.weekly : []) as WeeklyTarget[]
  const spend = (Array.isArray(parsed.expenses) ? parsed.expenses : []) as Expense[]
  if (!daily.length && !weekly.length && !spend.length && !('daily' in parsed || 'weekly' in parsed || 'expenses' in parsed)) throw new Error('That file is not a Target Tracker backup.')
  const goodDaily = daily.filter((t) => okBase(t as never) && isValidISO(t.date))
  const goodWeekly = weekly.filter((t) => okBase(t as never) && isValidISO(t.weekStartDate) && isMonday(t.weekStartDate))
    .map((t) => ({ ...t, weekEndDate: addDays(t.weekStartDate, 6) }))

  const goodSpend = spend
    .filter((e) => typeof e._id === 'string' && Number.isFinite(e.amount) && e.amount > 0 && isValidISO(e.date))
    .map((e) => ({ ...e, amount: round2(e.amount), category: CATEGORY_IDS.includes(e.category) ? e.category : ('other' as const), note: typeof e.note === 'string' ? e.note.slice(0, 200) : '' }))

  const db = readDB()
  const merge = <T extends { _id: string }>(into: T[], add: T[]) => {
    const byId = new Map(into.map((t) => [t._id, t]))
    for (const t of add) byId.set(t._id, t)
    return [...byId.values()]
  }
  writeDB({ daily: merge(db.daily, goodDaily), weekly: merge(db.weekly, goodWeekly), expenses: merge(db.expenses, goodSpend) })
  return { daily: goodDaily.length, weekly: goodWeekly.length, expenses: goodSpend.length }
}

/** Asks the browser not to evict this app's data when storage is low. */
export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.()
  } catch {}
}
