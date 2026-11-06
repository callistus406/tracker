'use client'

import { useEffect, useRef, useState } from 'react'
import { exportData, importData, lastBackup } from '@/lib/api'
import { toISO } from '@/lib/dates'
import { useToast } from './Toast'

/** Your data lives only on this phone, so a backup file is the safety net. */
export function BackupCard() {
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [last, setLast] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setLast(lastBackup()), [])

  const download = () => {
    const { json, counts } = exportData()
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `target-tracker-backup-${toISO(new Date())}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setLast(Date.now())
    toast(`Backed up ${counts.daily} daily, ${counts.weekly} weekly targets and ${counts.expenses} expenses`)
  }

  const restore = async (f: File | undefined) => {
    if (!f) return
    setError(null)
    try {
      const n = importData(await f.text())
      toast(`Restored ${n.daily} daily, ${n.weekly} weekly targets and ${n.expenses} expenses`)
    } catch (e) {
      setError((e as Error).message)
    }
    if (file.current) file.current.value = ''
  }

  return (
    <section id="backup" className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Backup &amp; restore</h2>
      <p className="mt-1 text-sm text-muted">
        Your targets and expenses are stored only on this phone. Save a backup file now and then, for example before changing
        phones or clearing browser data.
      </p>
      <p className="mt-2 text-xs text-muted">
        Last backup: {last ? new Date(last).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'never'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={download} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90">
          Save backup
        </button>
        <button onClick={() => file.current?.click()} className="rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-line/50">
          Restore from file
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </div>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    </section>
  )
}
