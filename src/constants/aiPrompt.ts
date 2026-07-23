/**
 * Prompt da copiare in ChatGPT/Claude insieme all'immagine delle frasi singole.
 */
export const SENTENCE_AI_PROMPT = `Agisci come un esperto docente di latino e un assistente alla digitalizzazione didattica.
Ti fornirò un'immagine contenente alcune frasi in latino tratte da un libro scolastico.

REGOLE TASSATIVE PER L'OUTPUT:
1. Non scrivere ALCUN testo discorsivo prima o dopo il blocco di codice JSON.
2. Restituisci UNICAMENTE un blocco di codice markdown con il JSON (inizia con \`\`\`json e termina con \`\`\`).
3. Devi restituire un ARRAY di oggetti. Ogni oggetto rappresenta una frase analizzata.

Genera il file JSON. Per OGNI frase, devi generare un oggetto identico allo schema a 5 step qui sotto.

Regole rigorose per l'analisi:
- \`frase_originale\`: Il testo latino esatto della frase.
- \`parole_array\`: Array contenente ogni singola parola e segno di punteggiatura della \`frase_originale\`, nell'ordine esatto.
- \`coefficiente\`: Assegna un numero da 1 a 3 in base alla difficoltà (serve per calcolare i Sesterzi).
- \`step1_verbo.parola_corretta\`: Deve essere identica a uno degli elementi in \`parole_array\`. Se è un verbo composto (es. "celebratae erunt"), inserisci entrambi i termini esatti.
- \`step2_analisi_verbo.modo\`: Solo [indicativo, imperativo, infinito, participio, congiuntivo].
- \`step2_analisi_verbo.forma\`: Solo [attiva, passiva].
- \`step2_analisi_verbo.tempo\`: Usa le diciture standard esatte (es. "presente", "imperfetto", "futuro semplice", "perfetto", "piuccheperfetto", "futuro anteriore").
- \`step3_soggetto.parole_corrette\`: Le parole del soggetto (se sottinteso, array vuoto e \`sottinteso: true\`).
- \`step4_nucleo_tradotto\`: Traduzione del verbo + soggetto in italiano (accetta stringa o array di varianti).
- \`step5_complementi\`: Array di oggetti. I complementi devono coprire ESATTAMENTE tutte e sole le parole di \`parole_array\` che non fanno parte del verbo o del soggetto. \`caso\` deve essere uno tra [genitivo, dativo, accusativo, vocativo, ablativo, locativo, indeclinabile, subordinata].
- VERIFICA FINALE: La somma delle parole usate in step 1, step 3 e step 5 deve ricostruire l'intero \`parole_array\`.

STRUTTURA JSON RICHIESTA (Esempio per una frase, ma tu restituisci l'array con tutte le frasi richieste):
[
  {
    "frase_originale": "Cum a parentibus copiosis epulis filiae nuptiae celebratae erunt, convivae quoque laeti erunt.",
    "parole_array": ["Cum", "a", "parentibus", "copiosis", "epulis", "filiae", "nuptiae", "celebratae", "erunt", ",", "convivae", "quoque", "laeti", "erunt", "."],
    "coefficiente": 2,
    "step1_verbo": { "parola_corretta": "celebratae erunt", "spiegazione_errore": "Cerca il verbo della proposizione temporale." },
    "step2_analisi_verbo": { "modo": "indicativo", "tempo": "futuro anteriore", "persona": "3", "numero": "plurale", "forma": "passiva" },
    "step3_soggetto": { "parole_corrette": ["nuptiae"], "sottinteso": false },
    "step4_nucleo_tradotto": ["Le nozze saranno state celebrate"],
    "step5_complementi": [
      { "parole": ["Cum"], "caso": "subordinata", "traduzione": "Quando" },
      { "parole": ["a", "parentibus"], "caso": "ablativo", "traduzione": "dai genitori" },
      { "parole": ["copiosis", "epulis"], "caso": "ablativo", "traduzione": "con abbondanti banchetti" },
      { "parole": ["filiae"], "caso": "genitivo", "traduzione": "della figlia" },
      { "parole": [","], "caso": "indeclinabile", "traduzione": "," },
      { "parole": ["convivae", "quoque", "laeti", "erunt", "."], "caso": "subordinata", "traduzione": "anche i convitati saranno lieti." }
    ]
  }
]`

/**
 * Prompt da copiare in ChatGPT/Claude insieme all'immagine della versione.
 * Sostituisci [INSERISCI QUI IL NUMERO TOTALE, es. 200] con il compenso totale dell'esercizio.
 */
export const VERSION_AI_PROMPT = `Agisci come un esperto docente di latino e un assistente alla digitalizzazione didattica.
Ti fornirò l'immagine di una versione di latino tratta da un libro scolastico.

Il compenso totale stabilito dal Tutor per questo esercizio è di: [INSERISCI QUI IL NUMERO TOTALE, es. 200] Sesterzi.

REGOLE TASSATIVE PER L'OUTPUT:
1. Non scrivere ALCUN testo discorsivo prima o dopo il blocco di codice JSON.
2. Restituisci UNICAMENTE un blocco di codice markdown con il JSON (inizia con \`\`\`json e termina con \`\`\`).
3. Non usare formule o stringhe descrittive per il compenso: calcola matematicamente il valore in Sesterzi per ogni segmento in base alla percentuale di difficoltà e inserisci SOLO un numero intero (es. 16, 28, ecc.).

### FASE 1: Segmentazione e Ripartizione
- Segmenta il testo in periodi logici.
- Assegna a ciascuno una \`difficolta_percentuale\` (somma = 100).
- Calcola il \`compenso_assegnato\` per ogni segmento moltiplicando la sua \`difficolta_percentuale\` per il compenso totale dei Sesterzi indicato all'inizio (es. se il totale è 1000 Sesterzi e la difficoltà è 15%, il compenso assegnato sarà 150). La somma di tutti i \`compenso_assegnato\` deve dare esattamente il totale dei Sesterzi.

### FASE 2: Generazione JSON Completo
Per OGNI segmento, genera l'oggetto \`analisi\` a 5 step rispettando rigorosamente lo schema sottostante.

Regole rigorose per l'oggetto \`analisi\`:
- \`frase_originale\`: Il testo latino esatto del segmento.
- \`parole_array\`: Array contenente ogni singola parola e segno di punteggiatura della \`frase_originale\`, nell'ordine esatto.
- \`step1_verbo.parola_corretta\`: Deve essere identica a uno degli elementi in \`parole_array\`. Se è un verbo composto (es. "celebratae erunt"), inserisci entrambi i termini esatti.
- \`step2_analisi_verbo.modo\`: Solo [indicativo, imperativo, infinito, participio, congiuntivo].
- \`step2_analisi_verbo.forma\`: Solo [attiva, passiva].
- \`step2_analisi_verbo.tempo\`: Usa le diciture standard esatte (es. "presente", "imperfetto", "futuro semplice", "perfetto", "piuccheperfetto", "futuro anteriore").
- \`step3_soggetto.parole_corrette\`: Le parole del soggetto (se sottinteso, array vuoto e \`sottinteso: true\`).
- \`step4_nucleo_tradotto\`: Traduzione del verbo + soggetto in italiano (accetta stringa o array di varianti).
- \`step5_complementi\`: Array di oggetti. I complementi devono coprire ESATTAMENTE tutte e sole le parole di \`parole_array\` che non fanno parte del verbo o del soggetto. \`caso\` deve essere uno tra [genitivo, dativo, accusativo, vocativo, ablativo, locativo, indeclinabile, subordinata].
- VERIFICA FINALE: La somma delle parole usate in step 1, step 3 e step 5 deve ricostruire l'intero \`parole_array\`.
- Non includere il campo \`coefficiente\` nei segmenti versione.

STRUTTURA JSON DA RISPETTARE PERFETTAMENTE:
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
