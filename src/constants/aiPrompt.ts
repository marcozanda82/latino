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
- \`step4_nucleo_tradotto\`: Traduzione IN ITALIANO ESCLUSIVAMENTE delle parole contenute in \`step1_verbo\` e \`step3_soggetto\`. ATTENZIONE CRITICA (DIVIETO DI SPOILER): Non tradurre assolutamente le congiunzioni (come cum, dum, simul atque, et, sed) né alcun avverbio o complemento. Se la frase è 'simul atque imperium obtinuerat', il nucleo deve essere SOLO ['aveva ottenuto'] oppure ['egli aveva ottenuto']. Se includi altre parole, rovini l'esercizio allo studente. (Accetta stringa o array di varianti equivalenti.)
- \`step5_complementi\`: Array di oggetti. I complementi devono coprire ESATTAMENTE tutte e sole le parole di \`parole_array\` che non fanno parte del verbo o del soggetto. \`caso\` deve essere uno tra [genitivo, dativo, accusativo, vocativo, ablativo, locativo, indeclinabile, congiunzione, subordinata]. DIVIETO DI ECO (ANTI-ECHO): Il campo \`traduzione\` DEVE ESSERE SEMPRE E SOLO IN ITALIANO. Non ricopiare MAI la parola latina nel campo traduzione. Ad esempio, se la parola è 'atque' o 'et', la traduzione DEVE essere 'e' (o 'ed', 'e anche'). Se è 'sed', deve essere 'ma'. Nessun campo traduzione può essere identico alle parole latine originali (fatta eccezione solo per i nomi propri che restano invariati, es. 'Roma').
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
]

=== ESEMPIO DI ANALISI PERFETTA DA EMULARE RIGOROSAMENTE ===
Frase latina: 'Augustus imperator, vir clarus, Romam venit senatusque eum laudavit.'

ATTENZIONE A COME LA FRASE VIENE DISSEZIONATA:
- 'Augustus' è il soggetto. 'imperator' e 'vir clarus' sono apposizioni/attributi e VANNO NEI COMPLEMENTI.
- 'senatusque' contiene la congiunzione enclitica '-que'. Va separata!

[
  {
    "frase_originale": "Augustus imperator, vir clarus, Romam venit",
    "parole_array": ["Augustus", "imperator", ",", "vir", "clarus", ",", "Romam", "venit"],
    "coefficiente": 2,
    "step1_verbo": { "parola_corretta": "venit", "spiegazione_errore": "..." },
    "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
    "step3_soggetto": { "parole_corrette": ["Augustus"], "sottinteso": false },
    "step4_nucleo_tradotto": ["Augusto venne"],
    "step5_complementi": [
      { "parole": ["imperator"], "caso": "nominativo", "traduzione": "l'imperatore" },
      { "parole": [","], "caso": "indeclinabile", "traduzione": "," },
      { "parole": ["vir", "clarus"], "caso": "nominativo", "traduzione": "uomo illustre" },
      { "parole": [","], "caso": "indeclinabile", "traduzione": "," },
      { "parole": ["Romam"], "caso": "accusativo", "traduzione": "a Roma" }
    ]
  },
  {
    "frase_originale": "senatusque eum laudavit.",
    "parole_array": ["senatus", "que", "eum", "laudavit", "."],
    "coefficiente": 2,
    "step1_verbo": { "parola_corretta": "laudavit", "spiegazione_errore": "..." },
    "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
    "step3_soggetto": { "parole_corrette": ["senatus"], "sottinteso": false },
    "step4_nucleo_tradotto": ["il senato lodò"],
    "step5_complementi": [
      { "parole": ["que"], "caso": "congiunzione", "traduzione": "e" },
      { "parole": ["eum"], "caso": "accusativo", "traduzione": "lo" },
      { "parole": ["."], "caso": "indeclinabile", "traduzione": "." }
    ]
  }
]
======================================================
DEVI copiare questa ESATTA precisione chirurgica. Nessuna parola aggregata in modo errato.`

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

### FASE 2: Analisi del periodo (Segmenti → Proposizioni → 5 Step)

STRUTTURA JSON RICHIESTA:
Restituisci un oggetto radice con \`tipo: "version"\` e un array \`segmenti\`.
Ogni segmento deve avere \`segmento_id\`, \`testo_latino\`, \`compenso_assegnato\` (percentuale) e un array \`proposizioni\`.
Nota per l'output JSON: usa \`id\` al posto di \`segmento_id\`; registra la percentuale in \`difficolta_percentuale\`; \`compenso_assegnato\` deve contenere il valore in Sesterzi (intero) calcolato come in FASE 1.

REGOLE PER LE PROPOSIZIONI E ANALISI:
1. Dividi il \`testo_latino\` del segmento in proposizioni logiche.
2. Per ogni proposizione compila \`testo_proposizione\`, \`tipo_proposizione\` (SOLO valori: 'principale', 'coordinata', 'subordinata') e \`parole_array\`. La somma dei \`parole_array\` di tutte le proposizioni deve ricostruire il segmento intero, punteggiatura inclusa.
3. All'interno di ogni proposizione, esegui i 5 step di analisi:
   - \`step1_verbo\`: { parola_corretta, spiegazione_errore }
   - \`step2_analisi_verbo\`: { modo, forma, tempo, persona, numero } (se indefinito, ometti persona e numero).
   - \`step3_soggetto\`: { parole_corrette, sottinteso: booleano }
   - \`step4_nucleo_tradotto\`: Traduzione IN ITALIANO ESCLUSIVAMENTE delle parole contenute in \`step1_verbo\` e \`step3_soggetto\`. ATTENZIONE CRITICA (DIVIETO DI SPOILER): Non tradurre assolutamente le congiunzioni (come cum, dum, simul atque, et, sed) né alcun avverbio o complemento. Se la frase è 'simul atque imperium obtinuerat', il nucleo deve essere SOLO ['aveva ottenuto'] oppure ['egli aveva ottenuto']. Se includi altre parole, rovini l'esercizio allo studente. (Array di stringhe con varianti equivalenti.)
   - \`step5_complementi\`: array di { parole, caso, traduzione }. Il caso deve essere uno tra [genitivo, dativo, accusativo, vocativo, ablativo, locativo, indeclinabile, congiunzione]. DIVIETO DI ECO (ANTI-ECHO): Il campo \`traduzione\` DEVE ESSERE SEMPRE E SOLO IN ITALIANO. Non ricopiare MAI la parola latina nel campo traduzione. Ad esempio, se la parola è 'atque' o 'et', la traduzione DEVE essere 'e' (o 'ed', 'e anche'). Se è 'sed', deve essere 'ma'. Nessun campo traduzione può essere identico alle parole latine originali (fatta eccezione solo per i nomi propri che restano invariati, es. 'Roma'). TRADUZIONE CHIRURGICA: Il campo \`traduzione\` di un complemento deve tradurre SOLO ed ESCLUSIVAMENTE le parole presenti nel suo array \`parole\`. È SEVERAMENTE VIETATO aggiungere congiunzioni italiane (come 'e', 'ma', 'invece') per far suonare meglio la frase, a meno che non ci sia l'esatta parola latina corrispondente (es. 'et', 'sed') all'interno di quello specifico array. (L'uso degli articoli determinativi/indeterminativi italiani è invece consentito).
   - IMPORTANTE: nello step 5 non devi più usare 'subordinata' come caso, perché la natura della frase è già definita in \`tipo_proposizione\`.

REGOLA DI VALIDAZIONE CRITICA (ZERO OMISSIONI):
È assolutamente vitale che OGNI SINGOLA PAROLA presente in \`parole_array\` (inclusa la punteggiatura) venga smistata in uno dei 3 step logici (Verbo, Soggetto o Complementi).
Prima di generare l'output JSON, esegui mentalmente questa somma:
(parole in step1_verbo) + (parole in step3_soggetto) + (tutte le parole negli oggetti di step5_complementi) DEVE ESSERE UGUALE AL 100% all'array iniziale \`parole_array\`.
Non tralasciare MAI preposizioni, nomi propri (es. 'in Asiam') o punteggiatura. Se una parola non è verbo o soggetto, DEVE finire nei complementi.
Per \`step1_verbo.parola_corretta\`: se il verbo è composto (es. "erant missi"), conta tutte le sue forme come parole del verbo. Ogni elemento di \`parole_array\` deve comparire esattamente una volta nella ripartizione totale.

4. \`step1_verbo.parola_corretta\` deve essere identica a uno o più elementi consecutivi di \`parole_array\`. Se è un verbo composto (es. "celebratae erunt"), inserisci entrambi i termini esatti.
5. \`step2_analisi_verbo.modo\`: Solo [indicativo, imperativo, infinito, participio, congiuntivo]. \`forma\`: Solo [attiva, passiva]. \`tempo\`: diciture standard esatte (es. "presente", "imperfetto", "futuro semplice", "perfetto", "piuccheperfetto", "futuro anteriore").
6. VERIFICA FINALE OBBLIGATORIA (per ogni proposizione): ricontrolla la REGOLA DI VALIDAZIONE CRITICA sopra. Se manca anche una sola parola di \`parole_array\`, correggi \`step5_complementi\` (o verbo/soggetto) prima di consegnare il JSON.
7. Non includere il campo \`coefficiente\` nei segmenti versione.

ESEMPIO JSON (schema da rispettare):
{
  "titolo": "Titolo",
  "tipo": "version",
  "autore": "Autore",
  "introduzione": "Testo...",
  "segmenti": [
    {
      "id": 1,
      "testo_latino": "Miltiades copias eduxit.",
      "difficolta_percentuale": 30,
      "compenso_assegnato": 60,
      "proposizioni": [
        {
          "id": 1,
          "testo_proposizione": "Miltiades copias eduxit.",
          "tipo_proposizione": "principale",
          "parole_array": ["Miltiades", "copias", "eduxit", "."],
          "step1_verbo": { "parola_corretta": "eduxit", "spiegazione_errore": "Cerca il verbo principale" },
          "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
          "step3_soggetto": { "parole_corrette": ["Miltiades"], "sottinteso": false },
          "step4_nucleo_tradotto": ["Milziade condusse fuori", "Milziade fece uscire"],
          "step5_complementi": [
            { "parole": ["copias"], "caso": "accusativo", "traduzione": "le truppe" },
            { "parole": ["."], "caso": "indeclinabile", "traduzione": "." }
          ]
        }
      ]
    },
    {
      "id": 2,
      "testo_latino": "Cum hostes advenissent, cives timuerunt.",
      "difficolta_percentuale": 70,
      "compenso_assegnato": 140,
      "proposizioni": [
        {
          "id": 1,
          "testo_proposizione": "Cum hostes advenissent,",
          "tipo_proposizione": "subordinata",
          "parole_array": ["Cum", "hostes", "advenissent", ","],
          "step1_verbo": { "parola_corretta": "advenissent", "spiegazione_errore": "Cerca il verbo della subordinata temporale" },
          "step2_analisi_verbo": { "modo": "congiuntivo", "tempo": "imperfetto", "persona": "3", "numero": "plurale", "forma": "attiva" },
          "step3_soggetto": { "parole_corrette": ["hostes"], "sottinteso": false },
          "step4_nucleo_tradotto": ["i nemici arrivarono", "arrivarono i nemici"],
          "step5_complementi": [
            { "parole": ["Cum"], "caso": "indeclinabile", "traduzione": "Quando" },
            { "parole": [","], "caso": "indeclinabile", "traduzione": "," }
          ]
        },
        {
          "id": 2,
          "testo_proposizione": "cives timuerunt.",
          "tipo_proposizione": "principale",
          "parole_array": ["cives", "timuerunt", "."],
          "step1_verbo": { "parola_corretta": "timuerunt", "spiegazione_errore": "Cerca il verbo principale" },
          "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "plurale", "forma": "attiva" },
          "step3_soggetto": { "parole_corrette": ["cives"], "sottinteso": false },
          "step4_nucleo_tradotto": ["i cittadini ebbero paura"],
          "step5_complementi": [
            { "parole": ["."], "caso": "indeclinabile", "traduzione": "." }
          ]
        }
      ]
    }
  ]
}

=== ESEMPIO DI ANALISI PERFETTA DA EMULARE RIGOROSAMENTE ===
Frase latina: 'Augustus imperator, vir clarus, Romam venit senatusque eum laudavit.'

ATTENZIONE A COME LA FRASE VIENE DISSEZIONATA: 
- 'Augustus' è il soggetto. 'imperator' e 'vir clarus' sono apposizioni/attributi e VANNO NEI COMPLEMENTI.
- 'senatusque' contiene la congiunzione enclitica '-que'. Va separata!

[
  {
    "testo_proposizione": "Augustus imperator, vir clarus, Romam venit",
    "tipo_proposizione": "principale",
    "parole_array": ["Augustus", "imperator", ",", "vir", "clarus", ",", "Romam", "venit"],
    "step1_verbo": { "parola_corretta": "venit", "spiegazione_errore": "..." },
    "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
    "step3_soggetto": { "parole_corrette": ["Augustus"], "sottinteso": false },
    "step4_nucleo_tradotto": ["Augusto venne"],
    "step5_complementi": [
      { "parole": ["imperator"], "caso": "nominativo", "traduzione": "l'imperatore" },
      { "parole": [","], "caso": "indeclinabile", "traduzione": "," },
      { "parole": ["vir", "clarus"], "caso": "nominativo", "traduzione": "uomo illustre" },
      { "parole": [","], "caso": "indeclinabile", "traduzione": "," },
      { "parole": ["Romam"], "caso": "accusativo", "traduzione": "a Roma" }
    ]
  },
  {
    "testo_proposizione": "senatusque eum laudavit.",
    "tipo_proposizione": "coordinata",
    "parole_array": ["senatusque", "eum", "laudavit", "."],
    "step1_verbo": { "parola_corretta": "laudavit", "spiegazione_errore": "..." },
    "step2_analisi_verbo": { "modo": "indicativo", "tempo": "perfetto", "persona": "3", "numero": "singolare", "forma": "attiva" },
    "step3_soggetto": { "parole_corrette": ["senatus"], "sottinteso": false },
    "step4_nucleo_tradotto": ["il senato lodò"],
    "step5_complementi": [
      { "parole": ["que"], "caso": "congiunzione", "traduzione": "e" },
      { "parole": ["eum"], "caso": "accusativo", "traduzione": "lo" },
      { "parole": ["."], "caso": "indeclinabile", "traduzione": "." }
    ]
  }
]
======================================================
DEVI copiare questa ESATTA precisione chirurgica. Nessuna parola aggregata in modo errato.`
