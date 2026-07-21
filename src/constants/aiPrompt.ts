/**
 * Prompt da copiare in ChatGPT/Claude insieme all'immagine della versione.
 * Sostituisci [INSERISCI QUI I SESTERZI] con il compenso totale dell'esercizio.
 */
export const VERSION_AI_PROMPT = `Agisci come un esperto docente di latino e un assistente alla digitalizzazione didattica.
Ti fornirò l'immagine di una versione di latino (o di un gruppo di frasi) tratta da un libro scolastico.

Il compenso totale stabilito dal Tutor per questo esercizio è di: [INSERISCI QUI I SESTERZI] Sesterzi.

Il tuo compito è analizzare l'immagine e generare un output diviso in DUE PARTI: un'analisi della difficoltà e un file JSON formattato.

### FASE 1: Analisi e Ripartizione (Testo normale)
1. Estrai il testo latino, il titolo, l'autore, l'introduzione (se presente) e le note a piè di pagina.
2. Segmenta il testo latino in periodi logici e compiuti (di solito delimitati da punti fermi).
3. Analizza la difficoltà grammaticale e sintattica di ogni segmento (es. presenza di ablativi assoluti, subordinate complesse, verbi deponenti, ecc.).
4. Elenca i segmenti in ordine decrescente di difficoltà (dal più difficile al più semplice).
5. Assegna a ciascun segmento una percentuale di difficoltà e ripartisci il compenso totale in base a questa percentuale. Se la difficoltà di alcuni segmenti risulta indistinguibile o non ci sono elementi sintattici di rilievo, stima la difficoltà assegnando un valore medio proporzionato per far quadrare il 100%. Nessun segmento deve avere un valore nullo.

### FASE 2: Generazione JSON (Code block)
Genera il file JSON da inserire nel database dell'applicazione, rispettando rigorosamente la seguente struttura. Assicurati che le note del libro siano associate al segmento corretto.

{
  "titolo": "Titolo della versione",
  "tipo": "version",
  "autore": "Nome Autore",
  "introduzione": "Testo introduttivo...",
  "segmenti": [
    {
      "id": 1,
      "latino": "Testo del primo segmento...",
      "note": "Eventuali aiuti o note del libro per questo segmento.",
      "difficolta_percentuale": 15,
      "compenso_assegnato": 30
    }
  ]
}

Regole rigide per il JSON:
- Non aggiungere campi non richiesti.
- La somma dei valori \`compenso_assegnato\` deve essere esattamente uguale al compenso totale indicato all'inizio.
- La somma delle \`difficolta_percentuale\` deve essere 100.`
