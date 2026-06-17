import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { showError } from '../lib/toast'
import {
  setTutorAuthenticated,
  verifyTutorPin,
} from '../services/tutorAuthService'

interface TutorPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const

export function TutorPinModal({ isOpen, onClose, onSuccess }: TutorPinModalProps) {
  const [pin, setPin] = useState('')

  const handleClose = () => {
    setPin('')
    onClose()
  }

  const handleSubmit = () => {
    if (verifyTutorPin(pin)) {
      setTutorAuthenticated()
      setPin('')
      onSuccess()
      return
    }

    showError('PIN errato. Riprova.')
    setPin('')
  }

  const handleKeyPress = (key: (typeof KEYPAD_KEYS)[number]) => {
    if (key === 'clear') {
      setPin('')
      return
    }

    if (key === 'back') {
      setPin((current) => current.slice(0, -1))
      return
    }

    if (pin.length >= 6) return
    setPin((current) => current + key)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <GlassCard>
            <h2 className="text-center text-lg font-semibold text-slate-800">
              Accesso Tutor
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
              Inserisci il PIN Tutor per continuare.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-semibold',
                    pin.length > index
                      ? 'border-slate-700 bg-slate-800 text-white'
                      : 'border-slate-200 bg-slate-50 text-transparent',
                  ].join(' ')}
                >
                  •
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className={[
                    'rounded-lg border px-3 py-3 text-sm font-medium transition-colors',
                    key === 'clear' || key === 'back'
                      ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {key === 'clear' ? 'C' : key === 'back' ? '⌫' : key}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pin.length < 4}
                className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Conferma
              </button>
            </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
