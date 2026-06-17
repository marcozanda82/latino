import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isTutorAuthenticated } from '../services/tutorAuthService'

interface TutorRouteProps {
  children: ReactNode
}

export function TutorRoute({ children }: TutorRouteProps) {
  if (!isTutorAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return children
}
