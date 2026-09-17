import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, LayoutDashboard } from 'lucide-react'
import { IS_DEMO_MODE } from '../config/features'
import { useDemoMode, type DemoRole } from '../context/DemoModeContext'

const ROLE_OPTIONS: {
  value: DemoRole
  label: string
  shortLabel: string
  Icon: typeof BookOpen
}[] = [
  {
    value: 'student',
    label: 'Area Studente',
    shortLabel: 'Studente',
    Icon: BookOpen,
  },
  {
    value: 'tutor',
    label: 'Pannello Tutor',
    shortLabel: 'Tutor',
    Icon: LayoutDashboard,
  },
]

export function DemoRoleSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const { demoRole, setDemoRole } = useDemoMode()

  if (!IS_DEMO_MODE) return null

  const handleSelect = (role: DemoRole) => {
    if (role === demoRole) {
      if (role === 'tutor' && !location.pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true, state: { adminTab: 'economia' } })
      } else if (role === 'student' && location.pathname !== '/') {
        navigate('/', { replace: true })
      }
      return
    }

    setDemoRole(role)

    if (role === 'tutor') {
      navigate('/admin', { replace: true, state: { adminTab: 'economia' } })
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:justify-between">
      <p className="hidden text-xs font-medium text-slate-500 sm:block">
        Visualizzazione
      </p>
      <div
        className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 shadow-sm"
        role="group"
        aria-label="Cambia visualizzazione"
      >
        {ROLE_OPTIONS.map((option) => {
          const isActive = demoRole === option.value
          const Icon = option.Icon

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleSelect(option.value)}
              className={[
                'inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm',
                isActive
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 can-hover:hover:bg-slate-50 can-hover:hover:text-slate-800',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
