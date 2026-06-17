import type { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
  header?: ReactNode
}

export function AppLayout({ children, header }: AppLayoutProps) {
  return (
    <div className="min-h-svh overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      {header && (
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 shadow-sm backdrop-blur-lg">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">{header}</div>
        </header>
      )}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  )
}
