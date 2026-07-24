import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { showError } from '../lib/toast'
import { assignManualBonus } from '../services/studentService'

interface ManualBonusModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ManualBonusModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualBonusModalProps) {
  const [amount, setAmount] = useState('100')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setAmount('100')
    setReason('')
    setIsSubmitting(false)
  }, [isOpen])

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      showError('Inserisci una quantità valida di Sesterzi (diversa da zero).')
      return
    }

    if (!reason.trim()) {
      showError('Inserisci una motivazione.')
      return
    }

    setIsSubmitting(true)

    try {
      await assignManualBonus(parsedAmount, reason)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('[ManualBonusModal] submit failed:', error)
      showError(
        error instanceof Error
          ? error.message
          : 'Impossibile assegnare i Sesterzi. Riprova.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-bonus-title"
          >
            <GlassCard className="!p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                Bonus tutor
              </p>
              <h2
                id="manual-bonus-title"
                className="mt-1 text-lg font-semibold text-slate-800"
              >
                Assegna Sesterzi manualmente
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Puoi inserire un valore negativo per una penalità o una
                rettifica.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="manual-bonus-amount"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Quantità Sesterzi
                  </label>
                  <input
                    id="manual-bonus-amount"
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-slate-400"
                    placeholder="Es. 150"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manual-bonus-reason"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Motivazione
                  </label>
                  <input
                    id="manual-bonus-reason"
                    type="text"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-slate-400"
                    placeholder="Es. Recupero punti versione"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors can-hover:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors can-hover:hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSubmitting ? 'Assegnazione…' : 'Conferma bonus'}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
