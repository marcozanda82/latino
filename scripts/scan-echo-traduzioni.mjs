import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const env = {}
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = loadEnv()

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

function norm(value) {
  return value.toLowerCase().trim()
}

function isPunctuationOnly(parole) {
  return parole.every((word) => /^[.,;:!?…]+$/.test(word))
}

function isEcho(parole, traduzione) {
  if (isPunctuationOnly(parole)) return false

  const variants = Array.isArray(traduzione) ? traduzione : [traduzione]
  const latinJoined = parole.join(' ')

  return variants.some((variant) => {
    const normalizedVariant = norm(String(variant))
    if (normalizedVariant === norm(latinJoined)) return true
    if (parole.length === 1 && normalizedVariant === norm(parole[0])) return true
    return false
  })
}

const echoes = []

function scanComplementi(complementi, context) {
  if (!Array.isArray(complementi)) return

  for (const complemento of complementi) {
    if (!complemento?.parole || complemento.traduzione === undefined) continue
    if (isEcho(complemento.parole, complemento.traduzione)) {
      echoes.push({
        ...context,
        parole: complemento.parole,
        traduzione: complemento.traduzione,
        caso: complemento.caso,
      })
    }
  }
}

const snap = await getDocs(collection(db, 'levels'))
console.log(`Levels count: ${snap.size}`)

for (const docSnap of snap.docs) {
  const data = docSnap.data()
  const title = data.title || docSnap.id

  if (data.analysis?.step5_complementi) {
    scanComplementi(data.analysis.step5_complementi, {
      levelId: docSnap.id,
      title,
      type: 'sentence',
      path: 'analysis.step5_complementi',
    })
  }

  if (data.version?.segmenti) {
    for (const segment of data.version.segmenti) {
      for (const proposizione of segment.proposizioni ?? []) {
        scanComplementi(proposizione.step5_complementi, {
          levelId: docSnap.id,
          title,
          type: 'version',
          segmentId: segment.id,
          proposizioneId: proposizione.id,
          testo: proposizione.testo_proposizione,
        })
      }
    }
  }
}

console.log(`Echo cases: ${echoes.length}`)
console.log(JSON.stringify(echoes, null, 2))
