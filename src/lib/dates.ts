// All dates are "YYYY-MM-DD" calendar-day strings in the user's local time.
const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const isValidISO = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s

export const today = () => toISO(new Date())

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Monday of the week containing `s` (weeks run Monday–Sunday). */
export function weekStartOf(s: string): string {
  const d = parseISO(s)
  return addDays(s, -((d.getDay() + 6) % 7))
}

export const weekEndOf = (weekStart: string) => addDays(weekStart, 6)
export const currentWeekStart = () => weekStartOf(today())

/** ISO-8601 week number (the week containing Thursday decides the year). */
export function weekNumber(weekStart: string): number {
  const thursday = parseISO(addDays(weekStart, 3))
  const jan1 = new Date(thursday.getFullYear(), 0, 1)
  const days = Math.round((thursday.getTime() - jan1.getTime()) / 86400000)
  return Math.floor(days / 7) + 1
}

export const formatLong = (s: string) =>
  parseISO(s).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export const formatShort = (s: string) =>
  parseISO(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

export function formatRange(start: string, end: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return a.getFullYear() === b.getFullYear()
    ? `${md(a)} – ${md(b)}, ${b.getFullYear()}`
    : `${md(a)}, ${a.getFullYear()} – ${md(b)}, ${b.getFullYear()}`
}
