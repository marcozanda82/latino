export function formatTransactionTimestamp(
  value?: { toDate?: () => Date },
): string {
  if (!value?.toDate) return '—'
  return value.toDate().toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTransactionAmount(amount: number): string {
  const isEarn = amount >= 0
  return `${isEarn ? '+' : '−'}${Math.abs(amount).toLocaleString('it-IT')} Sesterzi`
}
