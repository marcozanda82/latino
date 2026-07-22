import { useEffect, useState } from 'react'
import {
  subscribeToStudentProfile,
  type StudentProfile,
} from '../services/studentService'

export function useStudentProfile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeToStudentProfile((nextProfile) => {
      setProfile(nextProfile)
      setLoading(false)
    })
  }, [])

  return {
    profile,
    loading,
    aiFeedbackEnabled: profile?.aiFeedbackEnabled === true,
  }
}
