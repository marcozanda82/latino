export function buildTilesFromWords(
  words: string[],
  prefix = 'tile',
): Array<{ id: string; word: string; index: number }> {
  return words.map((word, index) => ({
    id: `${prefix}-${index}-${word}`,
    word,
    index,
  }))
}

export function areWordSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false

  const sortedA = [...a].sort()
  const sortedB = [...b].sort()

  return sortedA.every((word, index) => word === sortedB[index])
}
