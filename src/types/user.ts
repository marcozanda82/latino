export interface User {
  balance?: number
  aiFeedbackEnabled?: boolean
}

export const DEFAULT_USER: User = {
  balance: 0,
  aiFeedbackEnabled: false,
}
