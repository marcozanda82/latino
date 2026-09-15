import { useNavigate, useLocation } from 'react-router-dom'
import { IS_DEMO_MODE } from '../config/features'
import { useDemoMode, type DemoRole } from '../context/DemoModeContext'

const ROLE_OPTIONS: { value: DemoRole; label: string }[] = [
  { value: 'student', label: 'Studente' },
  { value: 'tutor', label: 'Tutor' },
]

export function DemoRoleSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const { demoRole, setDemoRole } = useDemoMode()

  if (!IS_DEMO_MODE) return null

  const handleSelect = (role: DemoRole) => {
    if (role === demoRole) return

    setDemoRole(role)

    if (role === 'tutor') {
      navigate('/admin')
      return
    }

    if (location.pathname.startsWith('/admin')) {
      navigate('/')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-900">
        Modalità demo
      </p>
      <div
        className="inline-flex rounded-full border border-amber-300 bg-white p-1 shadow-sm"
        role="group"
        aria-label="Vista demo"
      >
        {ROLE_OPTIONS.map((option) => {
          const isActive = demoRole === option.value

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleSelect(option.value)}
              className={[
                'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-900 can-hover:hover:bg-amber-50',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
