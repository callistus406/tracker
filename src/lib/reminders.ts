// Reminders. Everything is on-device: a browser can only show a notification while the app is open
// or running in the background, so there is also a calendar export (.ics) for alerts that always fire.
import { snapshot } from './api'
import { addDays, parseISO, toISO, today, weekStartOf } from './dates'

interface Slot {
  on: boolean
  time: string
}
export interface ReminderSettings {
  morning: Slot
  evening: Slot
  weekly: Slot
  expenses: Slot
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  morning: { on: false, time: '08:00' },
  evening: { on: false, time: '20:00' },
  weekly: { on: false, time: '18:00' },
  expenses: { on: false, time: '21:00' },
}

const SETTINGS_KEY = 'tt-reminders-v1'
const FIRED_KEY = 'tt-fired-v1'
/** A reminder that is more than this late is skipped (the target just shows as overdue instead). */
const WINDOW_MIN = 180

export function loadSettings(): ReminderSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '')
    return {
      morning: { ...DEFAULT_SETTINGS.morning, ...s.morning },
      evening: { ...DEFAULT_SETTINGS.evening, ...s.evening },
      weekly: { ...DEFAULT_SETTINGS.weekly, ...s.weekly },
      expenses: { ...DEFAULT_SETTINGS.expenses, ...s.expenses },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: ReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {}
}

export const anyEnabled = (s: ReminderSettings) => s.morning.on || s.evening.on || s.weekly.on || s.expenses.on

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const inWindow = (t: string, nowMin: number) => nowMin >= minutes(t) && nowMin - minutes(t) <= WINDOW_MIN
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export interface Due {
  id: string
  title: string
  body: string
  url: string
}

/** Everything that should have fired by `now` (callers skip the ones already fired). */
export function dueReminders(now = new Date()): Due[] {
  const s = loadSettings()
  const db = snapshot()
  const day = toISO(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const out: Due[] = []

  const open = db.daily.filter((t) => t.date === day && t.status !== 'completed')
  for (const t of open) {
    if (t.remindAt && inWindow(t.remindAt, nowMin)) {
      out.push({ id: `t:${t._id}:${t.remindAt}`, title: short(t.title), body: `Reminder for ${t.remindAt}`, url: '/daily/' })
    }
  }

  if (s.morning.on && inWindow(s.morning.time, nowMin)) {
    out.push({
      id: `morning:${day}`,
      title: 'Good morning',
      body: open.length ? `${plural(open.length, 'target')} for today: ${short(open[0].title)}${open.length > 1 ? '…' : ''}` : 'Nothing planned yet. Add today’s targets.',
      url: '/daily/',
    })
  }

  if (s.evening.on && open.length && inWindow(s.evening.time, nowMin)) {
    out.push({ id: `evening:${day}`, title: 'Evening check-in', body: `${plural(open.length, 'target')} still open today.`, url: '/daily/' })
  }

  if (s.expenses.on && inWindow(s.expenses.time, nowMin) && !db.expenses.some((e) => e.date === day)) {
    out.push({ id: `expenses:${day}`, title: 'Log your expenses', body: 'Nothing logged today. Add what you spent.', url: '/expenses/' })
  }

  if (s.weekly.on && now.getDay() === 0 && inWindow(s.weekly.time, nowMin)) {
    const week = db.weekly.filter((t) => t.weekStartDate === weekStartOf(day))
    const done = week.filter((t) => t.status === 'completed').length
    out.push({
      id: `weekly:${day}`,
      title: 'Weekly review',
      body: week.length ? `${done} of ${week.length} weekly targets done. Plan next week?` : 'Plan your targets for next week.',
      url: '/weekly/',
    })
  }
  return out
}

// ---- Already-fired bookkeeping (one list per day) ----

function firedToday(): Set<string> {
  try {
    const f = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '')
    if (f.day === today() && Array.isArray(f.ids)) return new Set(f.ids)
  } catch {}
  return new Set()
}

export const wasFired = (id: string) => firedToday().has(id)

function writeFired(ids: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ day: today(), ids: [...ids] }))
  } catch {}
}
export function markFired(id: string) {
  writeFired(firedToday().add(id))
}
export function unmarkFired(id: string) {
  const ids = firedToday()
  ids.delete(id)
  writeFired(ids)
}

// ---- Notifications ----

export type Permission = NotificationPermission | 'unsupported'

export const permission = (): Permission => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

export async function askPermission(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Shows a system notification. Returns false if it could not be shown (permission missing, etc.). */
export async function notify(title: string, body: string, url = '/', tag?: string): Promise<boolean> {
  if (permission() !== 'granted') return false
  const opts: NotificationOptions = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag, data: { url } }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
    return true
  } catch {
    return false
  }
}

// ---- Calendar export ----

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n')
const stamp = (iso: string, time: string) => `${iso.replace(/-/g, '')}T${time.replace(':', '')}00`

function event(uid: string, summary: string, start: string, extra: string[] = []) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@target-tracker`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART:${start}`,
    'DURATION:PT10M',
    `SUMMARY:${esc(summary)}`,
    ...extra,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
  ]
}

/** An .ics file: the enabled daily/weekly reminders as repeating events plus upcoming timed targets. */
export function buildCalendar(): { ics: string; count: number } {
  const s = loadSettings()
  const day = today()
  const events: string[][] = []
  if (s.morning.on) events.push(event('morning', 'Plan your day', stamp(day, s.morning.time), ['RRULE:FREQ=DAILY']))
  if (s.evening.on) events.push(event('evening', 'Evening check-in: finish today’s targets', stamp(day, s.evening.time), ['RRULE:FREQ=DAILY']))
  if (s.expenses.on) events.push(event('expenses', 'Log today’s expenses', stamp(day, s.expenses.time), ['RRULE:FREQ=DAILY']))
  if (s.weekly.on) {
    const sunday = addDays(weekStartOf(day), 6)
    const start = parseISO(day) > parseISO(sunday) ? addDays(sunday, 7) : sunday
    events.push(event('weekly', 'Weekly review: plan next week', stamp(start, s.weekly.time), ['RRULE:FREQ=WEEKLY;BYDAY=SU']))
  }
  for (const t of snapshot().daily) {
    if (t.remindAt && t.date >= day && t.status !== 'completed') events.push(event(`target-${t._id}`, t.title, stamp(t.date, t.remindAt)))
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Target Tracker//EN', 'CALSCALE:GREGORIAN', ...events.flat(), 'END:VCALENDAR']
  return { ics: lines.join('\r\n') + '\r\n', count: events.length }
}
