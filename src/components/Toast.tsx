'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastOpts {
  action?: { label: string; onClick: () => void }
  ms?: number
}
interface ToastState extends ToastOpts {
  id: number
  message: string
}

const Ctx = createContext<(message: string, opts?: ToastOpts) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((message: string, opts: ToastOpts = {}) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), message, ...opts })
    timer.current = setTimeout(() => setToast(null), opts.ms ?? 5000)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
        aria-live="polite"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-4 rounded-xl bg-fg px-4 py-2.5 text-sm text-page shadow-lg"
          >
            <span className="whitespace-pre-line">{toast.message}</span>
            {toast.action && (
              <button
                className="font-semibold underline"
                onClick={() => {
                  toast.action!.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}
