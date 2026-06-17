export const DROP_ZONE_IDS = {
  VERB: 'verb-drop-zone',
  SUBJECT: 'subject-drop-zone',
} as const

export const SUBJECT_ERROR_MESSAGES = {
  WRONG_TILE:
    'Attenzione: il soggetto deve essere al caso Nominativo e concordare in numero e persona con il verbo!',
  WRONG_IMPLICIT: 'Sicuro? Cerca bene nella frase, c\'è un Nominativo!',
} as const
