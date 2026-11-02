'use client'

import { useEffect, useState } from 'react'
import {
  askPermission,
  buildCalendar,
  loadSettings,
  notify,
  permission,
  saveSettings,
  type Permission,
  type ReminderSettings,
} from '@/lib/reminders'
import { BackupCard } from './BackupCard'
import { useToast } from './Toast'

type Theme = 'system' | 'light' | 'dark'
type SlotKey = keyof ReminderSettings

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: 'morning', label: 'Morning plan', hint: 'Your targets for the day' },
  { key: 'evening', label: 'Evening check-in', hint: 'Only if something is still open' },
  { key: 'weekly', label: 'Weekly review', hint: 'Sundays: how the week went' },
]

const card = 'rounded-2xl border border-line bg-surface p-5'

function applyTheme(t: Theme) {
  try {
    if (t === 'system') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('tt-theme')
    } else {
      document.documentElement.dataset.theme = t
      localStorage.setItem('tt-theme', t)
    }
  } catch {}
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 before:absolute before:-inset-2 before:content-[''] rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function SettingsView() {
  const toast = useToast()
  const [s, setS] = useState<ReminderSettings | null>(null)
  const [perm, setPerm] = useState<Permission>('default')
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    setS(loadSettings())
    setPerm(permission())
    try {
      setTheme((localStorage.getItem('tt-theme') as Theme) || 'system')
    } catch {}
  }, [])

  const update = async (next: ReminderSettings, turnedOn = false) => {
    setS(next)
    saveSettings(next)
    if (turnedOn && permission() === 'default') setPerm(await askPermission())
  }

  const setSlot = (key: SlotKey, patch: Partial<ReminderSettings[SlotKey]>) =>
    s && update({ ...s, [key]: { ...s[key], ...patch } }, patch.on === true)

  const test = async () => {
    const p = await askPermission()
    setPerm(p)
    const shown = await notify('Target Tracker', 'Reminders are working.', '/settings/', 'test')
    if (!shown) toast(p === 'granted' ? 'Could not show a notification on this device.' : 'Notifications are not allowed yet.')
  }

  const addToCalendar = () => {
    const { ics, count } = buildCalendar()
    if (!count) return toast('Turn on a reminder or give a target a time first.')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'target-tracker-reminders.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Calendar file saved (${count} ${count === 1 ? 'reminder' : 'reminders'}). Open it to add to your calendar.`, { ms: 8000 })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className={card} aria-labelledby="rem">
        <h2 id="rem" className="font-semibold">Reminders</h2>
        <p className="mt-1 text-sm text-muted">
          To remind yourself about one target, open it and set “Remind me at”. These are for the daily and weekly rhythm.
        </p>

        {perm === 'unsupported' && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">This browser can’t show notifications. Use the calendar option below.</p>}
        {perm === 'denied' && (
          <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            Notifications are blocked. In Chrome, open the ⋮ menu → Settings → Site settings → Notifications, and allow this app.
          </p>
        )}
        {perm === 'default' && (
          <button onClick={async () => setPerm(await askPermission())} className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90">
            Allow notifications
          </button>
        )}

        <ul className="mt-2 divide-y divide-line">
          {s &&
            SLOTS.map(({ key, label, hint }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="order-1 min-w-0 flex-1 basis-40">
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted">{hint}</p>
                </div>
                <input
                  type="time"
                  value={s[key].time}
                  disabled={!s[key].on}
                  onChange={(e) => e.target.value && setSlot(key, { time: e.target.value })}
                  aria-label={`${label} time`}
                  className="order-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent disabled:opacity-40 sm:order-2 sm:w-auto sm:text-sm"
                />
                <span className="order-2 sm:order-3">
                  <Switch on={s[key].on} onChange={(on) => setSlot(key, { on })} label={`${label} on or off`} />
                </span>
              </li>
            ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={test} className="rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-line/50">
            Send a test
          </button>
          <button onClick={addToCalendar} className="rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-line/50">
            Add to Google Calendar
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Notifications appear while the app is open or running in the background. Phones can pause a closed app, so for
          alerts that never miss, use “Add to Google Calendar”: it saves a file you open once, and your calendar does the
          rest (including your timed targets).
        </p>
      </section>

      <section className={card} aria-labelledby="look">
        <h2 id="look" className="font-semibold">Appearance</h2>
        <div className="mt-3 inline-flex rounded-xl border border-line p-0.5 text-sm">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={theme === t}
              onClick={() => {
                setTheme(t)
                applyTheme(t)
              }}
              className={`rounded-lg px-4 py-2.5 capitalize ${theme === t ? 'bg-accent font-medium text-accent-fg' : 'text-muted hover:bg-line/50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <BackupCard />
    </div>
  )
}
