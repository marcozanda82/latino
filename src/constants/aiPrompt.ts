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
- Assegna a ciascuno una \`difficolta_percentuale\` (la cui somma totale deve essere esattamente 100).
- Calcola il \`compenso_assegnato\` per ogni segmento moltiplicando la percentuale per il compenso totale dei Sesterzi fornito sopra (la somma totale deve coincidere esattamente con il compenso totale).

### FASE 2: Generazione JSON Completo
Per OGNI segmento, genera l'oggetto \`analisi\` a 5 step rispettando rigorosamente lo schema sottostante.

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
