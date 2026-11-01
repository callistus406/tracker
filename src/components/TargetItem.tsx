'use client'

import { useEffect, useRef, useState } from 'react'
import { STATUS_LABEL, type Target } from '@/types'
import { IconMore } from './Icons'
import { TargetCheck } from './TargetCheck'

interface Props {
  item: Target
  moveLabel: string
  onToggle: () => void
  onStart: () => void
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
}

export function TargetItem({ item, moveLabel, onToggle, onStart, onEdit, onMove, onDelete }: Props) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const done = item.status === 'completed'

  useEffect(() => {
    if (!menu) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menu])

  const entry = 'block w-full px-4 py-2.5 text-left text-sm hover:bg-line/50'
  const run = (fn: () => void) => () => {
    setMenu(false)
    fn()
  }

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="pt-0.5">
        <TargetCheck status={item.status} title={item.title} onToggle={onToggle} />
      </div>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={`block break-words ${done ? 'text-muted line-through' : 'font-medium'}`}>{item.title}</span>
        {item.description && (
          <span className="mt-0.5 block text-sm break-words whitespace-pre-line text-muted">{item.description}</span>
        )}
      </button>

      {item.status === 'in_progress' && (
        <button
          type="button"
          onClick={onToggle}
          title="Tap the circle to complete"
          className="shrink-0 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn"
        >
          {STATUS_LABEL.in_progress}
        </button>
      )}
      {item.status === 'not_started' && (
        <button
          type="button"
          onClick={onStart}
          className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-warn hover:text-warn"
        >
          Start
        </button>
      )}

      <div className="relative -my-1 -mr-2 shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={`Actions for ${item.title}`}
          aria-expanded={menu}
          className="rounded-lg p-2 text-muted hover:bg-line/50"
        >
          <IconMore />
        </button>
        {menu && (
          <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            <button role="menuitem" className={entry} onClick={run(onEdit)}>Edit</button>
            <button role="menuitem" className={entry} onClick={run(onMove)}>{moveLabel}</button>
            <button role="menuitem" className={entry + ' text-danger'} onClick={run(onDelete)}>Delete</button>
          </div>
        )}
      </div>
    </li>
  )
}
