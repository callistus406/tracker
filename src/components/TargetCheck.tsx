'use client'

import type { Status } from '@/types'
import { IconCheck } from './Icons'

/** One-tap circle: completes a target, or reopens it if already done. */
export function TargetCheck({ status, title, onToggle }: { status: Status; title: string; onToggle: () => void }) {
  const done = status === 'completed'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Mark "${title}" as not started` : `Mark "${title}" as completed`}
      className="-m-2 shrink-0 p-2"
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
          done
            ? 'border-accent bg-accent text-accent-fg'
            : status === 'in_progress'
              ? 'border-warn bg-warn-soft'
              : 'border-muted/60 hover:border-accent'
        }`}
      >
        {done && <IconCheck size={14} />}
        {status === 'in_progress' && <span className="size-2 rounded-full bg-warn" />}
      </span>
    </button>
  )
}
