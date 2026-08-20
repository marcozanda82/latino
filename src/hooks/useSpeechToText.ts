import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

export function useSpeechToText() {
  const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
  const isSupported = SpeechRecognitionCtor !== undefined

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) return

    recognitionRef.current?.abort()

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'it-IT'

    recognition.onresult = (event) => {
      let sessionText = ''
      for (let index = 0; index < event.results.length; index += 1) {
        sessionText += event.results[index][0]?.transcript ?? ''
      }
      setTranscript(sessionText)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setTranscript('')
    setIsListening(true)

    try {
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }, [SpeechRecognitionCtor])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  }
}
