'use client'

import { useRef } from 'react'
import { IconLeft, IconRight, IconWeek } from './Icons'

interface Props {
  onPrev: () => void
  onNext: () => void
  onCurrent: () => void
  currentLabel: string
  isCurrent: boolean
  pickerLabel: string
  pickerValue: string
  onPick: (isoDate: string) => void
}

export function PeriodNav(p: Props) {
  const picker = useRef<HTMLInputElement>(null)
  const btn = 'flex min-h-11 items-center rounded-xl border border-line bg-surface px-3.5 text-sm hover:bg-line/50'
  return (
    <div className="flex items-center gap-2">
      <button onClick={p.onPrev} className={btn} aria-label="Previous"><IconLeft /></button>
      <button onClick={p.onNext} className={btn} aria-label="Next"><IconRight /></button>
      <button
        onClick={p.onCurrent}
        disabled={p.isCurrent}
        className={`${btn} font-medium ${p.isCurrent ? 'opacity-50' : 'text-accent'}`}
      >
        {p.currentLabel}
      </button>
      <div className="relative ml-auto">
        <button onClick={() => picker.current?.showPicker?.()} className={btn} aria-label={p.pickerLabel}>
          <IconWeek />
        </button>
        {/* Visually hidden, but kept in the layout so the native picker anchors to the button. */}
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={p.pickerValue}
          onChange={(e) => e.target.value && p.onPick(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
    </div>
  )
}
