import { useEffect, useState } from 'react'
import { getApps, initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore, limit, query } from 'firebase/firestore'

interface DiagnosticLog {
  step: string
  time: number
  status: 'ok' | 'error' | 'pending'
  detail?: string
}

export default function Diagnostic() {
  const [logs, setLogs] = useState<DiagnosticLog[]>([])
  const [totalTime, setTotalTime] = useState(0)

  const addLog = (
    step: string,
    time: number,
    status: DiagnosticLog['status'],
    detail?: string,
  ) => {
    setLogs((prev) => [...prev, { step, time, status, detail }])
  }

  useEffect(() => {
    const runDiagnostics = async () => {
      const startTime = performance.now()

      const step1Start = performance.now()
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
      const step1Time = performance.now() - step1Start

      if (!apiKey) {
        addLog(
          'Lettura Variabili Ambiente (Vercel)',
          step1Time,
          'error',
          'VITE_FIREBASE_API_KEY è undefined',
        )
        setTotalTime(performance.now() - startTime)
        return
      }
      addLog('Lettura Variabili Ambiente', step1Time, 'ok', 'Variabili trovate')

      const step2Start = performance.now()
      try {
        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        }
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
        const step2Time = performance.now() - step2Start
        addLog(
          'Inizializzazione Firebase App',
          step2Time,
          'ok',
          `App ID: ${firebaseConfig.appId?.substring(0, 5)}...`,
        )

        const step3Start = performance.now()
        const db = getFirestore(app)

        try {
          const diagnosticQuery = query(
            collection(db, '_diagnostic_test_'),
            limit(1),
          )
          await getDocs(diagnosticQuery)
          const step3Time = performance.now() - step3Start
          addLog(
            'Ping Rete Firestore',
            step3Time,
            'ok',
            'Connessione stabilita con successo',
          )
        } catch (dbError) {
          const step3Time = performance.now() - step3Start
          const message =
            dbError instanceof Error ? dbError.message : 'Errore Firestore sconosciuto'
          addLog('Ping Rete Firestore', step3Time, 'error', message)
        }
      } catch (err) {
        const step2Time = performance.now() - step2Start
        const message =
          err instanceof Error ? err.message : 'Errore inizializzazione Firebase'
        addLog('Inizializzazione Firebase', step2Time, 'error', message)
      }

      setTotalTime(performance.now() - startTime)
    }

    void runDiagnostics()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-900 p-8 font-mono text-sm text-green-400">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Terminale Diagnostico di Sistema
      </h1>

      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={index} className="border-b border-gray-700 pb-2">
            <div className="flex justify-between gap-4">
              <span className="font-bold text-blue-300">
                [{index + 1}] {log.step}
              </span>
              <span
                className={
                  log.status === 'error' ? 'text-red-500' : 'text-green-500'
                }
              >
                {log.time.toFixed(2)} ms
              </span>
            </div>
            {log.detail && (
              <div
                className={
                  log.status === 'error'
                    ? 'mt-1 text-red-400'
                    : 'mt-1 text-gray-400'
                }
              >
                &gt; {log.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalTime > 0 && (
        <div className="mt-8 border-t border-white pt-4 font-bold text-yellow-300">
          Tempo Totale Boot: {totalTime.toFixed(2)} ms
        </div>
      )}
    </div>
  )
}
