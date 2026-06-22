import { useEffect, useState } from 'react'
import { subscribeToStudentBalance } from '../services/studentService'

export function useStudentBalance() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToStudentBalance((nextBalance) => {
      setBalance(nextBalance)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return { balance, loading }
}
