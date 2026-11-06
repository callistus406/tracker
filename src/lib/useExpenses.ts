'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ExpenseInput } from './api'
import type { Expense } from '@/types'

const UNDO_MS = 5000
const newestFirst = (a: Expense, b: Expense) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

/** Expenses dated from..to, kept in sync with storage. Deleting is undoable for a few seconds. */
export function useExpenses(from: string, to: string) {
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(new Map<string, { item: Expense; timer: ReturnType<typeof setTimeout> }>())

  const load = useCallback(() => {
    let stale = false
    setError(null)
    api.expenses
      .list(from, to)
      .then((r) => !stale && setItems(r))
      .catch((e: Error) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
    }
  }, [from, to])
  useEffect(() => load(), [load])

  const inRange = (e: Expense) => e.date >= from && e.date <= to

  const add = async (v: ExpenseInput) => {
    const e = await api.expenses.create(v)
    if (inRange(e)) setItems((xs) => [...xs, e].sort(newestFirst))
  }

  const edit = async (id: string, v: Partial<ExpenseInput>) => {
    const e = await api.expenses.update(id, v)
    setItems((xs) => {
      const rest = xs.filter((x) => x._id !== id)
      return inRange(e) ? [...rest, e].sort(newestFirst) : rest
    })
  }

  const restore = (item: Expense) => setItems((xs) => (xs.some((x) => x._id === item._id) ? xs : [...xs, item].sort(newestFirst)))

  const softDelete = (id: string) => {
    const item = items.find((x) => x._id === id)
    if (!item) return () => {}
    setItems((xs) => xs.filter((x) => x._id !== id))
    const commit = () => {
      pending.current.delete(id)
      api.expenses.remove(id).catch((e: Error) => {
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

  // Leaving the month (or page) finalises deletes still waiting on undo.
  useEffect(() => {
    const map = pending.current
    return () => {
      for (const [id, p] of map) {
        clearTimeout(p.timer)
        api.expenses.remove(id).catch(() => {})
      }
      map.clear()
    }
  }, [from, to])

  return { items, loading, error, setError, reload: load, add, edit, softDelete }
}
