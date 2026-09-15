import type { ReactNode } from 'react'
import { IS_DEMO_MODE } from '../../config/features'
import { DemoRoleSwitcher } from '../DemoRoleSwitcher'

interface AppLayoutProps {
  children: ReactNode
  header?: ReactNode
}

export function AppLayout({ children, header }: AppLayoutProps) {
  return (
    <div className="min-h-svh overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      {IS_DEMO_MODE && (
        <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-end">
            <DemoRoleSwitcher />
          </div>
        </div>
      )}
      {header && (
        <header
          className={[
            'sticky z-40 border-b border-slate-200/70 bg-white/75 shadow-sm backdrop-blur-lg',
            IS_DEMO_MODE ? 'top-[3.25rem]' : 'top-0',
          ].join(' ')}
        >
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">{header}</div>
        </header>
      )}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  )
}
