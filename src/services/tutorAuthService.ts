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

// Sostituisci la riga attuale con questa per un test immediato
export const verifyTutorPin = (inputPin: string): boolean => {
  const pinTest = "1234"; // Hardcodato forzato
  console.log("DEBUG - Pin inserito:", inputPin, "Pin atteso:", pinTest);
  return inputPin.trim() === pinTest;
};
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
