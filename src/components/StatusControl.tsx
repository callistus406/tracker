'use client'

import { STATUSES, STATUS_LABEL, type Status } from '@/types'

const ACTIVE: Record<Status, string> = {
  not_started: 'bg-line text-fg',
  in_progress: 'bg-warn-soft text-warn',
  completed: 'bg-accent-soft text-accent',
}

/** Three-way status picker (used in the add/edit form). */
export function StatusControl({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-xl border border-line p-1 text-sm">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`rounded-lg px-2 py-2 ${value === s ? ACTIVE[s] + ' font-medium' : 'text-muted hover:bg-line/50'}`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
