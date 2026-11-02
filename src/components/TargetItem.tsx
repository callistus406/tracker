'use client'

import { useEffect, useRef, useState } from 'react'
import { STATUS_LABEL, type Target } from '@/types'
import { IconBell, IconMore } from './Icons'
import { TargetCheck } from './TargetCheck'

interface Props {
  item: Target & { remindAt?: string }
  /** Reminder time has passed and the target is still open. */
  overdue?: boolean
  moveLabel: string
  onToggle: () => void
  onStart: () => void
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
}

export function TargetItem({ item, overdue, moveLabel, onToggle, onStart, onEdit, onMove, onDelete }: Props) {
  const [menu, setMenu] = useState(false)
  const [up, setUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const done = item.status === 'completed'

  useEffect(() => {
    if (!menu) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menu])

  const entry = 'block w-full px-4 py-3 text-left text-sm hover:bg-line/50'
  const run = (fn: () => void) => () => {
    setMenu(false)
    fn()
  }

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:p-4">
      <div className="pt-0.5">
        <TargetCheck status={item.status} title={item.title} onToggle={onToggle} />
      </div>

      <div className="min-w-0 flex-1">
        <button type="button" onClick={onEdit} className="block w-full text-left">
          <span className={`block break-words ${done ? 'text-muted line-through' : 'font-medium'}`}>{item.title}</span>
          {item.description && (
            <span className="mt-0.5 block text-sm break-words whitespace-pre-line text-muted">{item.description}</span>
          )}
        </button>

        {(!done || item.remindAt) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.status === 'in_progress' && (
              <button
                type="button"
                onClick={onToggle}
                title="Tap the circle to complete"
                className="rounded-full bg-warn-soft px-3 py-1.5 text-xs font-medium text-warn"
              >
                {STATUS_LABEL.in_progress}
              </button>
            )}
            {item.status === 'not_started' && (
              <button
                type="button"
                onClick={onStart}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-warn hover:text-warn"
              >
                Start
              </button>
            )}
            {item.remindAt && (
              <button
                type="button"
                onClick={onEdit}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${
                  overdue ? 'bg-warn-soft font-medium text-warn' : 'bg-line/60 text-muted'
                }`}
              >
                <IconBell size={13} /> {item.remindAt}
                {overdue && ' · overdue'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative -my-1 -mr-2 shrink-0" ref={ref}>
        <button
          type="button"
          onClick={(e) => {
            // Open upward when there is no room below (the bottom tab bar would cover the menu).
            setUp(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 220)
            setMenu((m) => !m)
          }}
          aria-label={`Actions for ${item.title}`}
          aria-expanded={menu}
          className="rounded-lg p-2.5 text-muted hover:bg-line/50"
        >
          <IconMore />
        </button>
        {menu && (
          <div role="menu" className={`absolute right-0 z-20 w-48 ${up ? 'bottom-full mb-1' : 'top-full mt-1'} overflow-hidden rounded-xl border border-line bg-surface shadow-lg`}>
            <button role="menuitem" className={entry} onClick={run(onEdit)}>Edit</button>
            <button role="menuitem" className={entry} onClick={run(onMove)}>{moveLabel}</button>
            <button role="menuitem" className={entry + ' text-danger'} onClick={run(onDelete)}>Delete</button>
          </div>
        )}
      </div>
    </li>
  )
}
