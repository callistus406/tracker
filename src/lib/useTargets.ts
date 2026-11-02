'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TargetInput, UpdateInput } from './api'
import type { Status, Target } from '@/types'

export interface Adapter<T extends Target> {
  list: (key: string) => Promise<T[]>
  create: (key: string, v: TargetInput) => Promise<T>
  update: (id: string, v: UpdateInput) => Promise<T>
  remove: (id: string) => Promise<void>
}

const UNDO_MS = 5000

/** Loads the targets for one day/week and keeps them in sync with the server. */
export function useTargets<T extends Target>(adapter: Adapter<T>, key: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(new Map<string, { item: T; timer: ReturnType<typeof setTimeout> }>())

  const load = useCallback(() => {
    let stale = false
    setError(null)
    adapter
      .list(key)
      .then((r) => !stale && setItems(r))
      .catch((e: Error) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
    }
  }, [adapter, key])

  useEffect(() => load(), [load])

  /** Create in `period` (defaults to the current day/week). Only shown here if it lands here. */
  const add = async (v: TargetInput, period = key) => {
    const created = await adapter.create(period, v)
    if (period === key) setItems((xs) => [...xs, created])
  }

  /** Edit; a changed `period` moves the target to another day/week, so it leaves this list. */
  const edit = async (id: string, v: UpdateInput) => {
    const updated = await adapter.update(id, v)
    setItems((xs) =>
      v.period && v.period !== key ? xs.filter((x) => x._id !== id) : xs.map((x) => (x._id === id ? { ...x, ...updated } : x)),
    )
  }

  // Optimistic so progress updates instantly; rolled back if the save fails.
  const setStatus = async (id: string, status: Status) => {
    const prev = items
    setItems((xs) => xs.map((x) => (x._id === id ? { ...x, status } : x)))
    try {
      await adapter.update(id, { status })
    } catch (e) {
      setItems(prev)
      setError((e as Error).message)
    }
  }

  const restore = (item: T) =>
    setItems((xs) => (xs.some((x) => x._id === item._id) ? xs : [...xs, item].sort((a, b) => a.createdAt.localeCompare(b.createdAt))))

  /** Hides the target now and deletes it for real after a few seconds unless undone. */
  const softDelete = (id: string) => {
    const item = items.find((x) => x._id === id)
    if (!item) return () => {}
    setItems((xs) => xs.filter((x) => x._id !== id))
    const commit = () => {
      pending.current.delete(id)
      adapter.remove(id).catch((e: Error) => {
        restore(item)
        setError(e.message)
      })
    }
    pending.current.set(id, { item, timer: setTimeout(commit, UNDO_MS) })
    return () => {
      const p = pending.current.get(id)
      if (!p) return
      clearTimeout(p.timer)
      pending.current.delete(id)
      restore(item)
    }
  }

  // Leaving the day/week (or page) finalises any deletes still waiting on undo.
  useEffect(() => {
    const map = pending.current
    return () => {
      for (const [id, p] of map) {
        clearTimeout(p.timer)
        adapter.remove(id).catch(() => {})
      }
      map.clear()
    }
  }, [adapter, key])

  return { items, loading, error, setError, reload: load, add, edit, setStatus, softDelete }
}

export type TargetsApi<T extends Target> = ReturnType<typeof useTargets<T>>
