/**
 * Calcola il voto scolastico in decimi, arrotondato al mezzo voto più vicino.
 * Esempi: 7.3 → 7.5, 8.1 → 8.0, 6.8 → 7.0
 */
export function calculateSchoolGrade(
  pointsObtained: number,
  maxPoints: number,
): number {
  if (!Number.isFinite(pointsObtained) || !Number.isFinite(maxPoints)) {
    return 1
  }

  if (maxPoints <= 0) {
    return pointsObtained > 0 ? 10 : 1
  }

  const raw = (pointsObtained / maxPoints) * 10
  const rounded = Math.round(raw * 2) / 2
  return Math.min(10, Math.max(1, rounded))
}

export function formatSchoolGrade(grade: number): string {
  const formatted =
    grade % 1 === 0 ? grade.toFixed(0) : grade.toFixed(1)
  return `${formatted} / 10`
}
