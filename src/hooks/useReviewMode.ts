import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useReviewMode(): boolean {
  const [searchParams] = useSearchParams()

  return useMemo(
    () => searchParams.get('mode') === 'review',
    [searchParams],
  )
}
