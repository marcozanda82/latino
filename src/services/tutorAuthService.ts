const SESSION_KEY = 'isTutorAuthenticated'

export function isTutorAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function setTutorAuthenticated(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true')
  } catch (error) {
    console.error('[tutorAuthService] setTutorAuthenticated failed:', error)
  }
}

export function clearTutorAuthentication(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.error('[tutorAuthService] clearTutorAuthentication failed:', error)
  }
}

export function verifyTutorPin(inputPin: string): boolean {
  const expectedPin = import.meta.env.VITE_TUTOR_PIN?.trim() || '1234'
  return String(inputPin).trim() === expectedPin
}
