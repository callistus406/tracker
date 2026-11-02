'use client'

import { useEffect } from 'react'
import { dueReminders, markFired, notify, unmarkFired, wasFired } from '@/lib/reminders'
import { useToast } from './Toast'

const CHECK_MS = 20_000

/** Fires due reminders while the app is open (or alive in the background). Falls back to an in-app toast. */
export function ReminderRunner() {
  const toast = useToast()

  useEffect(() => {
    const tick = () => {
      const fresh = dueReminders().filter((d) => !wasFired(d.id))
      fresh.forEach((d) => markFired(d.id))
      Promise.all(fresh.map((d) => notify(d.title, d.body, d.url, d.id))).then((shown) => {
        const missed = fresh.filter((_, i) => !shown[i])
        if (!missed.length) return
        if (document.visibilityState === 'visible') {
          // One toast for everything that came due together, so none is overwritten.
          toast(missed.map((d) => `${d.title}: ${d.body}`).join('\n'), { ms: 8000 })
        } else {
          missed.forEach((d) => unmarkFired(d.id)) // nobody saw it: try again when the app is next opened
        }
      })
    }
    tick()
    const timer = setInterval(tick, CHECK_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [toast])

  return null
}
