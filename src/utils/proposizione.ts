import type { LatinAnalysis } from '../types'
import type { Proposizione, VersionSegment } from '../types/version'
import { buildFullTranslation } from './complements'

export function proposizioneToLatinAnalysis(
  proposizione: Proposizione,
): LatinAnalysis {
  return {
    frase_originale: proposizione.testo_proposizione,
    parole_array: proposizione.parole_array,
    step1_verbo: proposizione.step1_verbo,
    step2_analisi_verbo: proposizione.step2_analisi_verbo,
    step3_soggetto: proposizione.step3_soggetto,
    step4_nucleo_tradotto: proposizione.step4_nucleo_tradotto,
    step5_complementi: proposizione.step5_complementi,
  }
}

export function getVersionSegmentPrimaryProposizione(
  segment: VersionSegment,
): Proposizione {
  return (
    segment.proposizioni.find(
      (proposizione) => proposizione.tipo_proposizione === 'principale',
    ) ?? segment.proposizioni[0]
  )
}

/** Adattatore temporaneo finché il flusso versione non gestisce tutte le proposizioni. */
export function getVersionSegmentPrimaryAnalysis(
  segment: VersionSegment,
): LatinAnalysis {
  return proposizioneToLatinAnalysis(getVersionSegmentPrimaryProposizione(segment))
}

export function buildVersionSegmentFullTranslation(
  segment: VersionSegment,
): string {
  return segment.proposizioni
    .map((proposizione) =>
      buildFullTranslation(proposizioneToLatinAnalysis(proposizione)),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
