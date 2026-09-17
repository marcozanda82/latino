import { useEffect, useMemo, useState } from 'react'
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-qr-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Condivisione rapida
                </p>
                <h2
                  id="share-qr-title"
                  className="mt-2 font-serif text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl"
                >
                  Traduttore Latino — Analisi Guidata
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex flex-col items-center px-5 py-6 sm:px-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <QRCode
                  value={shareUrl || 'https://'}
                  size={220}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
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
        </div>
      ) : null}
    </AnimatePresence>
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
