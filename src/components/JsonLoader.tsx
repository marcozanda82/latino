import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import {
  JsonLoadError,
  parseLatinAnalysisJson,
} from '../utils/validateLatinAnalysis'
import type { LatinAnalysis } from '../types'

interface JsonLoaderProps {
  onLoadComplete: (analysis: LatinAnalysis) => void
  onError: (message: string) => void
}

export function JsonLoader({ onLoadComplete, onError }: JsonLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [jsonText, setJsonText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const processContent = useCallback(
    (content: string, sourceName?: string) => {
      try {
        const analysis = parseLatinAnalysisJson(content)
        if (sourceName) setFileName(sourceName)
        onLoadComplete(analysis)
      } catch (error) {
        const message =
          error instanceof JsonLoadError
            ? error.message
            : 'Errore: Il file JSON non ha il formato corretto per l\'esercizio'
        onError(message)
      }
    },
    [onLoadComplete, onError],
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        onError('Seleziona un file con estensione .json')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const content = String(reader.result ?? '')
        setJsonText(content)
        setFileName(file.name)
        processContent(content, file.name)
      }
      reader.onerror = () => {
        onError('Impossibile leggere il file selezionato.')
      }
      reader.readAsText(file)
    },
    [onError, processContent],
  )

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
    event.target.value = ''
  }

  const handlePasteLoad = () => {
    processContent(jsonText)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col gap-8"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Opzione 1
        </p>
        <h2 className="mt-1 text-base font-medium text-slate-700">
          Carica file JSON
        </h2>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
            isDragging
              ? 'border-slate-500 bg-slate-50'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold uppercase tracking-wider text-slate-400">
            JSON
          </span>
          <p className="mt-3 text-sm font-medium text-slate-700">
            Trascina qui il file .json
          </p>
          <p className="mt-1 text-xs text-slate-400">
            oppure clicca per selezionarlo dal computer
          </p>
          {fileName && (
            <p className="mt-3 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
              {fileName}
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 flex items-center justify-center">
          <span className="bg-white px-3 text-xs font-medium uppercase tracking-widest text-slate-300">
            oppure
          </span>
        </div>
        <div className="border-t border-slate-100 pt-8" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Opzione 2
        </p>
        <h2 className="mt-1 text-base font-medium text-slate-700">
          Incolla il JSON
        </h2>

        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder={'{\n  "frase_originale": "Caesar exercitum in proelium ducit",\n  "parole_array": ["Caesar", "exercitum", "in", "proelium", "ducit"],\n  ...\n}'}
          rows={10}
          className="mt-4 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />

        <button
          type="button"
          onClick={handlePasteLoad}
          disabled={!jsonText.trim()}
          className="mt-4 w-full rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Carica Esercizio
        </button>
      </div>
    </motion.div>
  )
}
