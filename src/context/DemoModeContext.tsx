import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { IS_DEMO_MODE } from '../config/features'
import {
  clearTutorAuthentication,
  isTutorAuthenticated,
  setTutorAuthenticated,
} from '../services/tutorAuthService'

export type DemoRole = 'tutor' | 'student'

interface DemoModeContextValue {
  demoRole: DemoRole
  setDemoRole: (role: DemoRole) => void
  /** Accesso pannello admin / rotte tutor (rispetta il role switcher in demo). */
  hasTutorAccess: boolean
  /** Override segmenti (bacchetta): visibile in demo anche simulando lo studente. */
  canUseTutorOverride: boolean
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null)

function resolveInitialDemoRole(): DemoRole {
  return isTutorAuthenticated() ? 'tutor' : 'student'
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRoleState] = useState<DemoRole>(resolveInitialDemoRole)

  const setDemoRole = useCallback((role: DemoRole) => {
    setDemoRoleState(role)

    if (!IS_DEMO_MODE) return

    if (role === 'tutor') {
      setTutorAuthenticated()
      return
    }

    clearTutorAuthentication()
  }, [])

  const hasTutorAccess = IS_DEMO_MODE
    ? demoRole === 'tutor'
    : isTutorAuthenticated()

  const canUseTutorOverride = IS_DEMO_MODE || isTutorAuthenticated()

  const value = useMemo(
    () => ({
      demoRole,
      setDemoRole,
      hasTutorAccess,
      canUseTutorOverride,
    }),
    [canUseTutorOverride, demoRole, hasTutorAccess, setDemoRole],
  )

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  )
}

export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider')
  }
  return context
}
