import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Share2, X } from 'lucide-react'
import QRCode from 'react-qr-code'

interface ShareQrModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareQrModal({ isOpen, onClose }: ShareQrModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  const handleCopy = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[ShareQrModal] clipboard write failed:', error)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="share-qr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-qr-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative mx-auto my-auto flex w-full max-w-sm max-h-[80dvh] flex-col items-center justify-center overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="w-full pr-10 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Condivisione rapida
              </p>
              <h2
                id="share-qr-title"
                className="mt-2 font-serif text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl"
              >
                Traduttore Latino — Analisi Guidata
              </h2>
            </header>

            <div className="mt-6 flex w-full flex-col items-center">
              <div className="w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <QRCode
                  value={shareUrl || 'https://'}
                  size={256}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  className="h-auto w-full"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>

              <p className="mt-5 max-w-full break-all text-center font-mono text-sm text-slate-600">
                {shareUrl}
              </p>

              <button
                type="button"
                onClick={handleCopy}
                className={[
                  'mt-5 inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium shadow-sm transition-colors',
                  copied
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-800 bg-slate-800 text-white hover:bg-slate-700',
                ].join(' ')}
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {copied ? 'Link copiato!' : 'Copia Link'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export function ShareAppButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Condividi
      </button>
      <ShareQrModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
