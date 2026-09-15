import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IS_DEMO_MODE } from '../config/features'
import { useDemoMode } from '../context/DemoModeContext'
import { isTutorAuthenticated } from '../services/tutorAuthService'

interface TutorRouteProps {
  children: ReactNode
}

export function TutorRoute({ children }: TutorRouteProps) {
  const { hasTutorAccess } = useDemoMode()
  const allowed = IS_DEMO_MODE ? hasTutorAccess : isTutorAuthenticated()

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return children
}
