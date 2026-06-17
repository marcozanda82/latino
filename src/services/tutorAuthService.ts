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

export const verifyTutorPin = (inputPin: string): boolean => {
  // Sostituiamo import.meta.env con una stringa fissa per il test finale
  const expectedPin = "1234"; 
  
  // Prepariamo i valori rimuovendo spazi e forzando a stringa
  const cleanInput = String(inputPin).trim();
  const cleanExpected = String(expectedPin).trim();
  
  console.log("DEBUG - Inserito (pulito):", cleanInput);
  console.log("DEBUG - Atteso (pulito):", cleanExpected);
  console.log("Confronto:", cleanInput === cleanExpected);
  
  return cleanInput === cleanExpected;
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
