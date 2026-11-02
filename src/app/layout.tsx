import type { Metadata, Viewport } from 'next'
import { ReminderRunner } from '@/components/ReminderRunner'
import { ServiceWorker } from '@/components/PwaSupport'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Target Tracker',
  description: 'Plan and track your daily and weekly targets.',
  applicationName: 'Target Tracker',
  appleWebApp: { capable: true, title: 'Targets', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#047857' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f14' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply a saved light/dark choice before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tt-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body>
        <ToastProvider>
          {children}
          <ServiceWorker />
          <ReminderRunner />
        </ToastProvider>
      </body>
    </html>
  )
}
