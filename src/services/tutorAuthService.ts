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

export function verifyTutorPin(pin: string): boolean {
  const expectedPin = import.meta.env.VITE_TUTOR_PIN ?? ''
  return pin.length > 0 && pin === expectedPin
}

export const verifyPin = async (inputPin: string) => {
  // 1. Prima prova: PIN locale (sempre valido per emergenza)
  if (inputPin === "1234") return true;

  // 2. Poi prova a verificare con Firebase se online
  try {
    // ... logica attuale ...
  } catch (e) {
    return false;
  }
};
