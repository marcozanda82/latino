export type ExerciseDraftStep = 1 | 2 | 3 | 4 | 5

export interface ExerciseDraftData {
  userId: string
  exerciseId: string
  fraseOriginale: string
  currentStep: ExerciseDraftStep
  step1Complete: boolean
  step2Complete: boolean
  step3Complete: boolean
  step4Complete: boolean
  step5Complete: boolean
  score: number
  mechanicalScore: number
  studentCoreTranslation: string
  studentComplementTranslations: string[]
  step1PlacedTileId: string | null
  step2Completed: Record<string, boolean> | null
  step2SelectedAnswers: Record<string, string> | null
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
  step5CurrentIndex: number
  step5CaseLocked: boolean
  step5SelectedCase: string | null
}
