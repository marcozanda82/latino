import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join, extname } from 'path'
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

/** Traduzioni italiane per parole latine invariabili/comuni (lowercase). */
const INVARIABLE_TRANSLATIONS = {
  et: 'e',
  atque: 'e',
  ac: 'e',
  sed: 'ma',
  aut: 'oppure',
  vel: 'oppure',
  nec: 'e non',
  neque: 'e non',
  non: 'non',
  nam: 'infatti',
  enim: 'infatti',
  autem: 'invece',
  etiam: 'anche',
  ita: 'così',
  sic: 'così',
  tam: 'così',
  tamen: 'tuttavia',
  igitur: 'dunque',
  itaque: 'dunque',
  vero: 'invece',
  at: 'ma',
  cum: 'quando',
  dum: 'finché',
  si: 'se',
  nisi: 'se non',
  quoque: 'anche',
  que: 'e',
  ut: 'affinché',
  ne: 'affinché non',
  quod: 'che',
  quia: 'perché',
  quoniam: 'poiché',
  ubi: 'dove',
  unde: 'da dove',
  quo: 'dove',
  hic: 'qui',
  haec: 'questa',
  hoc: 'questo',
  ille: 'quello',
  illa: 'quella',
  illud: 'quello',
  is: 'egli',
  ea: 'ella',
  id: 'esso',
  me: 'mi',
  te: 'ti',
  se: 'sé',
  nos: 'ci',
  vos: 'vi',
  eum: 'lo',
  eam: 'la',
  eos: 'li',
  eas: 'le',
  mihi: 'a me',
  tibi: 'a te',
  sibi: 'a sé',
  nobis: 'a noi',
  vobis: 'a voi',
  meum: 'mio',
  tuum: 'tuo',
  suum: 'suo',
  nostrum: 'nostro',
  vestrum: 'vostro',
  in: 'in',
  ad: 'a',
  ab: 'da',
  ex: 'da',
  de: 'di',
  cum_abl: 'con',
  pro: 'per',
  per: 'attraverso',
  sub: 'sotto',
  super: 'sopra',
  inter: 'tra',
  ante: 'prima di',
  post: 'dopo',
  apud: 'presso',
  sine: 'senza',
  ob: 'a causa di',
}

function resolveItalianTranslation(parole, caso, tipoProposizione) {
  if (parole.length === 1) {
    const word = norm(parole[0])

    if (word === 'cum') {
      if (caso === 'ablativo' || caso === 'ablative') return 'con'
      if (tipoProposizione === 'subordinata' || caso === 'subordinata') return 'quando'
      return 'quando'
    }

    if (word === 'in' && caso === 'accusativo') return 'in'
    if (word === 'in' && caso === 'ablativo') return 'in'

    if (INVARIABLE_TRANSLATIONS[word]) {
      return INVARIABLE_TRANSLATIONS[word]
    }
  }

  return null
}

function fixComplemento(complemento, tipoProposizione) {
  if (!complemento?.parole || complemento.traduzione === undefined) {
    return { complemento, changed: false }
  }

  if (!isEcho(complemento.parole, complemento.traduzione)) {
    return { complemento, changed: false }
  }

  const suggested = resolveItalianTranslation(
    complemento.parole,
    complemento.caso,
    tipoProposizione,
  )

  if (!suggested) {
    return {
      complemento,
      changed: false,
      unresolved: true,
      parole: complemento.parole,
      traduzione: complemento.traduzione,
    }
  }

  const nextTraduzione = Array.isArray(complemento.traduzione)
    ? complemento.traduzione.map(() => suggested)
    : suggested

  return {
    complemento: { ...complemento, traduzione: nextTraduzione },
    changed: true,
    from: complemento.traduzione,
    to: nextTraduzione,
  }
}

function fixComplementi(complementi, tipoProposizione) {
  if (!Array.isArray(complementi)) {
    return { complementi, changes: [], unresolved: [] }
  }

  const changes = []
  const unresolved = []
  const next = complementi.map((complemento) => {
    const result = fixComplemento(complemento, tipoProposizione)
    if (result.changed) {
      changes.push({
        parole: complemento.parole,
        from: result.from,
        to: result.to,
      })
    }
    if (result.unresolved) unresolved.push(result)
    return result.complemento
  })

  return { complementi: next, changes, unresolved }
}

function fixLatinAnalysis(analysis) {
  const { complementi, changes, unresolved } = fixComplementi(
    analysis.step5_complementi,
    undefined,
  )

  return {
    analysis: { ...analysis, step5_complementi: complementi },
    changes,
    unresolved,
  }
}

function fixVersion(version) {
  const allChanges = []
  const allUnresolved = []

  const segmenti = version.segmenti.map((segment) => {
    const proposizioni = (segment.proposizioni ?? []).map((proposizione) => {
      const { complementi, changes, unresolved } = fixComplementi(
        proposizione.step5_complementi,
        proposizione.tipo_proposizione,
      )

      if (changes.length > 0) {
        allChanges.push({
          segmentId: segment.id,
          proposizioneId: proposizione.id,
          changes,
        })
      }
      if (unresolved.length > 0) {
        allUnresolved.push({
          segmentId: segment.id,
          proposizioneId: proposizione.id,
          unresolved,
        })
      }

      return { ...proposizione, step5_complementi: complementi }
    })

    return { ...segment, proposizioni }
  })

  return {
    version: { ...version, segmenti },
    changes: allChanges,
    unresolved: allUnresolved,
  }
}

function walkJsonFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
      walkJsonFiles(fullPath, files)
    } else if (extname(entry) === '.json') {
      files.push(fullPath)
    }
  }
  return files
}

function fixJsonFile(filePath) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return { filePath, skipped: true, reason: 'invalid json' }
  }

  const fileChanges = []

  const fixItem = (item, label) => {
    if (item?.step5_complementi) {
      const { complementi, changes, unresolved } = fixComplementi(
        item.step5_complementi,
        item.tipo_proposizione,
      )
      if (changes.length > 0) {
        item.step5_complementi = complementi
        fileChanges.push({ label, changes })
      }
      if (unresolved.length > 0) {
        fileChanges.push({ label, unresolved })
      }
    }
  }

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) => fixItem(item, `item[${index}]`))
  } else if (parsed?.analysis?.step5_complementi) {
    const result = fixLatinAnalysis(parsed.analysis)
    parsed.analysis = result.analysis
    if (result.changes.length > 0) fileChanges.push({ label: 'analysis', changes: result.changes })
    if (result.unresolved.length > 0) fileChanges.push({ label: 'analysis', unresolved: result.unresolved })
  } else {
    fixItem(parsed, 'root')
    if (parsed?.segmenti) {
      for (const segment of parsed.segmenti) {
        for (const proposizione of segment.proposizioni ?? []) {
          fixItem(proposizione, `segment ${segment.id}`)
        }
      }
    }
  }

  const hasFixes = fileChanges.some((entry) => entry.changes?.length > 0)
  if (hasFixes) {
    writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
  }

  return { filePath, fileChanges, updated: hasFixes }
}

const localResults = walkJsonFiles(root)
  .filter((file) => !file.includes('package-lock.json'))
  .map(fixJsonFile)

console.log('Local JSON scan:')
for (const result of localResults) {
  if (result.skipped) continue
  if (result.updated || result.fileChanges.some((entry) => entry.unresolved?.length)) {
    console.log(JSON.stringify(result, null, 2))
  }
}

const snap = await getDocs(collection(db, 'levels'))
const firestoreReport = []

for (const docSnap of snap.docs) {
  const data = docSnap.data()
  const updates = {}
  let changes = []

  if (data.analysis) {
    const result = fixLatinAnalysis(data.analysis)
    if (result.changes.length > 0) {
      updates.analysis = result.analysis
      changes = result.changes
    }
    if (result.unresolved.length > 0) {
      firestoreReport.push({
        levelId: docSnap.id,
        title: data.title,
        unresolved: result.unresolved,
      })
    }
  }

  if (data.version) {
    const result = fixVersion(data.version)
    if (result.changes.length > 0) {
      updates.version = result.version
      changes = [...changes, ...result.changes.flatMap((entry) => entry.changes)]
    }
    if (result.unresolved.length > 0) {
      firestoreReport.push({
        levelId: docSnap.id,
        title: data.title,
        unresolved: result.unresolved,
      })
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'levels', docSnap.id), updates)
    firestoreReport.push({
      levelId: docSnap.id,
      title: data.title,
      fixed: changes,
    })
  }
}

console.log('\nFirestore fixes:')
console.log(JSON.stringify(firestoreReport, null, 2))
