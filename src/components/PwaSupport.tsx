'use client'

import { useEffect, useState } from 'react'
import { requestPersistence } from '@/lib/api'
import { IconDownload } from './Icons'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Registers the service worker (production only, so dev hot reload is never served from cache). */
export function ServiceWorker() {
  useEffect(() => {
    requestPersistence()
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const register = () =>
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker registration failed', e))
    // Wait for the page to finish loading so registration never competes with first render.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])
  return null
}

/** Shows an "Install app" button when the browser offers to install the PWA (Android Chrome, desktop Chrome/Edge). */
export function InstallButton({ className = '' }: { className?: string }) {
  const [evt, setEvt] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as InstallEvent)
    }
    const onInstalled = () => setEvt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!evt) return null
  return (
    <button
      onClick={async () => {
        await evt.prompt()
        await evt.userChoice
        setEvt(null)
      }}
      className={`flex items-center gap-2 rounded-xl border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft ${className}`}
    >
      <IconDownload size={16} /> Install app
    </button>
  )
}

