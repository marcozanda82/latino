/**
 * Prompt da copiare in ChatGPT/Claude insieme all'immagine della versione.
 * Sostituisci [INSERISCI QUI I SESTERZI] con il compenso totale dell'esercizio.
 */
export const VERSION_AI_PROMPT = `Agisci come un esperto docente di latino e un assistente alla digitalizzazione didattica.
Ti fornirò l'immagine di una versione di latino (o di un gruppo di frasi) tratta da un libro scolastico.

Il compenso totale stabilito dal Tutor per questo esercizio è di: [INSERISCI QUI I SESTERZI] Sesterzi.

### FASE 1: Analisi, Segmentazione e Ripartizione (Testo normale)
1. Estrai il testo latino, il titolo, l'autore, l'introduzione e le note a piè di pagina.
2. Segmenta il testo latino in periodi logici (basandoti sui segni di interpunzione forti). Non spezzare subordinate all'interno dello stesso periodo.
3. Assegna a ciascun segmento una percentuale di difficoltà (totale 100%) e ripartisci il compenso totale in base a questa percentuale (nessun segmento a zero).

### FASE 2: Generazione JSON (Code block)
Genera il file JSON. Per OGNI segmento, devi generare un oggetto \`analisi\` identico allo schema delle 'Frasi Singole' a 5 step.

Regole rigorose per l'oggetto \`analisi\`:
- \`frase_originale\`: Il testo latino esatto del segmento.
- \`parole_array\`: Array contenente ogni singola parola e segno di punteggiatura della \`frase_originale\`, nell'ordine esatto.
- \`step1_verbo.parola_corretta\`: Deve essere identica a uno degli elementi in \`parole_array\`.
- \`step2_analisi_verbo.modo\`: Solo [indicativo, imperativo, infinito, participio, congiuntivo].
- \`step2_analisi_verbo.forma\`: Solo [attiva, passiva].
- \`step3_soggetto.parole_corrette\`: Le parole del soggetto (se sottinteso, array vuoto e \`sottinteso: true\`).
- \`step4_nucleo_tradotto\`: Traduzione del verbo + soggetto in italiano (accetta stringa o array di varianti).
- \`step5_complementi\`: Array di oggetti. I complementi devono coprire ESATTAMENTE tutte e sole le parole di \`parole_array\` che non fanno parte del verbo o del soggetto. \`caso\` deve essere uno tra [genitivo, dativo, accusativo, vocativo, ablativo, locativo, indeclinabile, subordinata].
- VERIFICA FINALE: La somma delle parole usate in step 1, step 3 e step 5 deve ricostruire l'intero \`parole_array\`.

STRUTTURA JSON RICHIESTA:
{
  "titolo": "Titolo",
  "tipo": "version",
  "autore": "Autore",
  "introduzione": "Testo...",
  "segmenti": [
    {
      "id": 1,
      "note": "Eventuali aiuti",
      "difficolta_percentuale": 30,
      "compenso_assegnato": 60,
      "analisi": {
        "frase_originale": "Miltiades copias eduxit.",
        "parole_array": ["Miltiades", "copias", "eduxit", "."],
        "step1_verbo": { "parola_corretta": "eduxit", "spiegazione_errore": "Cerca il verbo principale" },
        "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
        "step3_soggetto": { "parole_corrette": ["Miltiades"], "sottinteso": false },
        "step4_nucleo_tradotto": ["Milziade condusse fuori", "Milziade fece uscire"],
        "step5_complementi": [ { "parole": ["copias"], "caso": "accusativo", "traduzione": "le truppe" }, { "parole": ["."], "caso": "indeclinabile", "traduzione": "." } ]
      }
    }
  ]
}`
