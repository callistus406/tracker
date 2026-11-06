'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { IconDay, IconHistory, IconHome, IconSliders, IconWallet, IconWeek } from './Icons'

const NAV: { href: string; label: string; short: string; icon: ReactNode; sidebarOnly?: boolean }[] = [
  { href: '/', label: 'Dashboard', short: 'Home', icon: <IconHome /> },
  { href: '/daily', label: 'Daily Targets', short: 'Daily', icon: <IconDay /> },
  { href: '/weekly', label: 'Weekly Targets', short: 'Weekly', icon: <IconWeek /> },
  { href: '/expenses', label: 'Expenses', short: 'Expenses', icon: <IconWallet /> },
  { href: '/history', label: 'History', short: 'History', icon: <IconHistory /> },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: <IconSliders />, sidebarOnly: true },
]

export function Nav({ variant }: { variant: 'sidebar' | 'tabs' }) {
  const pathname = usePathname()
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  if (variant === 'sidebar') {
    return (
      <nav className="space-y-1" aria-label="Main">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
              active(n.href) ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-line/50'
            }`}
          >
            {n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
    )
  }
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV.filter((n) => !n.sidebarOnly).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? 'page' : undefined}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${active(n.href) ? 'font-medium text-accent' : 'text-muted'}`}
        >
          {n.icon}
          {n.short}
        </Link>
      ))}
    </nav>
  )
}
