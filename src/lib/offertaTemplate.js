// ─────────────────────────────────────────────────────────────────────────────
// Catalogo prestazioni e testi fissi dell'offerta di prestazioni professionali.
// Ricalca il modello "OFFERTA TIPO.docx" dello Studio Prini.
//
// Convenzioni nei testi:
//   **grassetto**  → porzione in grassetto
//   «etichetta»    → campo compilabile: genera un input nel pannello e viene
//                    sostituito nel documento con il valore inserito.
// ─────────────────────────────────────────────────────────────────────────────

export const STUDIO_NOME = "Studio Prini";

// Estrae i campi «...» da un testo, nell'ordine in cui compaiono.
export function estraiCampi(testo) {
  const out = [];
  const re = /«([^»]*)»/g;
  let m, i = 0;
  while ((m = re.exec(testo)) !== null) out.push({ key: `f${i++}`, label: m[1] });
  return out;
}

// Sostituisce i «...» con i valori forniti (fallback: il placeholder stesso).
export function compilaTesto(testo, valori = {}) {
  let i = 0;
  return testo.replace(/«([^»]*)»/g, (_, label) => {
    const v = valori[`f${i++}`];
    return v !== undefined && String(v).trim() !== "" ? String(v).trim() : label;
  });
}

// Spezza un testo in segmenti { text, bold } interpretando **…**
export function segmentaGrassetto(testo) {
  const parts = String(testo).split(/\*\*/);
  return parts
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter(p => p.text !== "");
}

// ── Sezione opzionale di inquadramento ───────────────────────────────────────
export const INQUADRAMENTO = {
  id: "inquadramento",
  titolo: "INQUADRAMENTO DEL PROGETTO",
  testo:
    "Il progetto prevede la ristrutturazione di «descrizione locali» situati in «indirizzo» a Milano. " +
    "Gli spazi sono composti da «composizione» per un totale di circa «__» mq. " +
    "Il progetto prevede «tipo di attività / intervento». Secondo la nostra stima preliminare la durata " +
    "stimata del cantiere è di «__» settimane, per un importo delle opere stimato di € «______».",
};

// ── Sezioni prestazione (lettere A, B, C… assegnate automaticamente) ─────────
// modoPrezzo: "forfait" → un solo importo per la sezione
//             "voci"    → ogni voce ha il suo importo, il totale è la somma
export const SEZIONI = [
  {
    id: "progettazione",
    titolo: "PROGETTAZIONE ARCHITETTONICA",
    titoloTabella: "PROGETTAZIONE ARCHITETTONICA",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: "FASE 1",
        voci: [
          { id: "pa1", testo: "Studio di fattibilità progettuale attraverso l'acquisizione della documentazione fornita dalla Committente e analisi della documentazione raccolta;" },
          { id: "pa2", testo: "Rilievo geometrico e restituzione grafica dell'unità immobiliare restituito in planimetrie, prospetti e sezioni;" },
          { id: "pa3", testo: "Verifica della normativa vigente, P.G.T., Regolamento Edilizio, N.T.A., regolamenti di igiene;" },
          { id: "pa4", testo: "Consegna di progetto preliminare architettonico (schema layout distributivo) e mood board materico;" },
          { id: "pa5", testo: "Riunione tecnica progettuale con la Committente per approvazione layout di progetto." },
        ],
      },
      {
        label: "FASE 2",
        voci: [
          { id: "pa6", testo: "Redazione del progetto architettonico definitivo restituito in pianta, prospetto, sezione, modellazione 3D e realizzazione di rendering in numero e formato adeguato alla definitiva approvazione del Committente;" },
          { id: "pa7", testo: "Scelta dei materiali e delle finiture in coordinamento con la Committente;" },
          { id: "pa8", testo: "Coordinamento alla progettazione delle strutture e dell'impianto elettrico, termico e idrosanitario;" },
          { id: "pa9", testo: "Redazione di progetto definitivo della disposizione degli arredi interni e degli allestimenti;" },
          { id: "pa10", testo: "Redazione di progetto architettonico elettrico (planimetrie e prospetti);" },
          { id: "pa11", testo: "Redazione di progetto architettonico idrico sanitario (planimetrie e prospetti);" },
          { id: "pa12", testo: "Redazione di progetto architettonico degli impianti di riscaldamento e raffrescamento (planimetrie e prospetti)." },
        ],
      },
    ],
  },
  {
    id: "urbanistiche",
    titolo: "PRATICHE URBANISTICHE CATASTALI",
    titoloTabella: "PRATICHE URBANISTICHE CATASTALI",
    modoPrezzo: "voci",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "pu0", testo: "Acquisizione della documentazione, verifica completezza documentazione in relazione alle esigenze del Committente, analisi ambiti normativi di attuazione dell'intervento, pianificazione lavoro, incontri e sopralluoghi con uffici di competenza.", prezzo: false },
          { id: "pu1", testo: "Redazione e presentazione della pratica edilizia per l'ottenimento del titolo edilizio ad eseguire i lavori, a discrezione del professionista con **CILA** ai sensi dell'art. 6bis, d.P.R. 6 giugno 2001, n. 380.", prezzo: true },
          { id: "pu2", testo: "Redazione e presentazione della pratica edilizia con **SCIA** ai sensi dell'art. 22, d.P.R. 380/2001. Comunicazione di fine lavori e successiva presentazione della Segnalazione Certificata di Agibilità ai sensi dell'art. 24, d.P.R. 380/2001.", prezzo: true },
          { id: "pu3", testo: "Redazione e presentazione della pratica edilizia con **SCIA alternativa al P.d.C.** ai sensi dell'art. 23, d.P.R. 380/2001, e successiva Segnalazione Certificata di Agibilità ai sensi dell'art. 24.", prezzo: true },
          { id: "pu4", testo: "Redazione e presentazione della pratica edilizia **in variante** alla SCIA PG «___» del «gg/mm/aaaa», a discrezione del professionista ai sensi del d.P.R. 380/2001.", prezzo: true },
          { id: "pu5", testo: "Redazione e presentazione di n° «_» aggiornamento catastale, nuovo Docfa e planimetria «[ridisegno Elaborato Planimetrico parti comuni]», invio telematico con firma digitale forte agli uffici di competenza dell'Agenzia del Territorio.", prezzo: true, prezzoLabel: "Cad. €" },
        ],
      },
    ],
  },
  {
    id: "commerciali",
    titolo: "PRATICHE COMMERCIALI SANITARIE",
    titoloTabella: "PRATICHE COMMERCIALI SANITARIE",
    modoPrezzo: "voci",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "pc1", testo: "Sopralluoghi, redazione di planimetria asseverata, redazione ed invio telematico di n° 1 SCIA Commerciale attività di vendita con firma digitale forte. Assistenza post-presentazione in caso di sopralluoghi con eventuali integrazioni. Apertura unità locale presso la Camera di Commercio.", prezzo: true },
          { id: "pc2", testo: "Redazione ed invio telematico di n° 1 SCIA Commerciale per attività di somministrazione (per modifiche strutturali e acustiche) con firma digitale forte. Assistenza post-presentazione con eventuali integrazioni. Apertura unità locale presso la Camera di Commercio.", prezzo: true },
          { id: "pc3", testo: "Redazione ed invio telematico di n° «_» SCIA Commerciale per subentro in attività di somministrazione. Nuova dichiarazione TARI. Presentazione telematica con firma digitale forte. Assistenza post-presentazione con eventuali integrazioni.", prezzo: true, prezzoLabel: "Cad. €" },
          { id: "pc4", testo: "Redazione ed invio telematico di SCIA per cambio requisiti acustici, con firma digitale forte.", prezzo: true },
          { id: "pc5", testo: "Rilievi metrici e fotografici, acquisizione documentazione specifica, redazione e presentazione di procedura / SCIA per esposizione insegne e mezzi pubblicitari (ed eventuale cessazione dei precedenti mezzi pubblicitari).", prezzo: true },
          { id: "pc6", testo: "Redazione e presentazione di richiesta di autorizzazione / modifica / voltura occupazione suolo pubblico (OSAP).", prezzo: true },
        ],
      },
    ],
  },
  {
    id: "project_management",
    titolo: "PROJECT MANAGEMENT",
    titoloTabella: "PROJECT MANAGEMENT",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "pm1", testo: "Affidamento incarico project manager alla figura dell'arch. Matteo Citelli (iscrizione ordine degli architetti, pianificatori, paesaggisti e conservatori n° 23405);" },
          { id: "pm2", testo: "Organizzazione delle fasi del progetto;" },
          { id: "pm3", testo: "Redazione di computo metrico per la preventivazione e la definizione delle imprese incaricate per OPERE EDILI, IMPIANTISTICHE, ALLESTIMENTI, ARREDI;" },
          { id: "pm4", testo: "Assistenza alla gestione capitolati, contratti d'appalto e documentazione delle imprese in coordinamento con la Committenza per OPERE EDILI, IMPIANTISTICHE, ALLESTIMENTI, ARREDI;" },
          { id: "pm5", testo: "Redazione e aggiornamento di cronoprogramma delle opere in coordinamento con le imprese appaltatrici;" },
          { id: "pm6", testo: "Redazione di fascicolo di progetto, completo degli elaborati grafici e delle indicazioni per il corretto sviluppo delle lavorazioni edili, impiantistiche e di arredo;" },
          { id: "pm7", testo: "Coordinamento effettuato tramite riunioni in presenza e/o online con progettisti impianti, fornitori, locatari e tecnici terzi e Committenza, con cadenza prevista settimanale." },
        ],
      },
    ],
  },
  {
    id: "direzione_lavori",
    titolo: "DIREZIONE LAVORI",
    titoloTabella: "DIREZIONE LAVORI",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "dl1", testo: "Assunzione responsabilità direttore lavori identificato nella figura dell'arch. Matteo Citelli (iscrizione ordine degli architetti, pianificatori, paesaggisti e conservatori n° 23405);" },
          { id: "dl2", testo: "Coordinamento con i tecnici incaricati e imprese esecutrici in cantiere (previsionale n° «_» visite in cantiere per una durata dei lavori prevista di «_» settimane);" },
          { id: "dl3", testo: "Assistenza ai lavori edili per verificare la corretta esecuzione nel rispetto della pratica edilizia e del progetto architettonico;" },
          { id: "dl4", testo: "Assistenza ai lavori di allestimento in cantiere e presso i laboratori incaricati all'esecuzione delle opere;" },
          { id: "dl5", testo: "Redazione verbali di sopralluogo in cantiere settimanali;" },
          { id: "dl6", testo: "Supervisione per lavori impiantistici con elaborati grafici forniti da terzi." },
        ],
      },
    ],
  },
  {
    id: "sicurezza",
    titolo: "COORDINATORE DELLA SICUREZZA",
    titoloTabella: "COORDINATORE DELLA SICUREZZA",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "cs1", testo: "Assunzione responsabilità Coordinatore della Sicurezza D.lgs. 81/08 da parte del Geometra Sandro Gusella (iscrizione albo dei Geometri e dei Geometri laureati di Padova n° 3347);" },
          { id: "cs2", testo: "Redazione del PSC per la fase preliminare di progettazione;" },
          { id: "cs3", testo: "Invio notifica preliminare del cantiere agli Enti territorialmente competenti previa delega del Committente;" },
          { id: "cs4", testo: "Riunione di coordinamento alla presenza della Committenza, dell'Impresa Affidataria e Sub affidatarie e del Direttore Lavori, redazione verbale da inviare ai soggetti partecipanti;" },
          { id: "cs5", testo: "Redazione e aggiornamento PSC e TAVOLE LAYOUT;" },
          { id: "cs6", testo: "Analisi e verifica accettazione dei POS delle imprese coinvolte;" },
          { id: "cs7", testo: "Verifica idoneità tecnico professionale delle maestranze operanti in cantiere allo scopo di autorizzarne l'ingresso nello stesso;" },
          { id: "cs8", testo: "Sopralluoghi (n. 1 alla settimana o più se ritenuto necessario) e redazione verbali degli interventi in corso d'opera;" },
          { id: "cs9", testo: "Verbale Fine Lavori." },
        ],
      },
    ],
  },
  {
    id: "responsabile_lavori",
    titolo: "RESPONSABILE DEI LAVORI",
    titoloTabella: "RESPONSABILE DEI LAVORI",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "rl1", testo: "Assunzione ruolo Responsabile dei Lavori D.lgs. 81/08 da parte del Geometra Sandro Gusella (iscrizione albo dei Geometri e dei Geometri laureati di Padova n° 3347);" },
          { id: "rl2", testo: "Redazione ed invio della Notifica Preliminare su portale On Line GeCa Cantieri Regione Lombardia;" },
          { id: "rl3", testo: "Verifica documentale attinente alle imprese o lavoratori autonomi selezionati;" },
          { id: "rl4", testo: "Redazione della Check-List di verifica e nulla Osta all'ingresso in cantiere." },
        ],
      },
    ],
  },
  {
    id: "strutture",
    titolo: "PROGETTAZIONE E DIREZIONE LAVORI OPERE STRUTTURALI",
    titoloTabella: "PROGETTAZIONE E D.L. OPERE STRUTTURALI",
    modoPrezzo: "forfait",
    gruppi: [
      {
        label: null,
        voci: [
          { id: "st1", testo: "Sopralluogo per assaggi e verifiche stato di fatto delle strutture;" },
          { id: "st2", testo: "Incarico di ingegnere strutturale affidato all'ing. Diego Riboni (iscrizione albo degli ingegneri di Como n° 2123);" },
          { id: "st3", testo: "Redazione di pratica strutturale 'allegato F' da depositare in allegato alla SCIA edilizia;" },
          { id: "st4", testo: "Verifiche di esecuzione con rilascio di dichiarazione di regolare esecuzione delle opere strutturali da allegare alla fine lavori di SCIA edilizia;" },
          { id: "st5", testo: "Progetto opere strutturali;" },
          { id: "st6", testo: "Deposito sismico completo su portale strutture del Comune di Milano;" },
          { id: "st7", testo: "Direzione lavori strutture;" },
          { id: "st8", testo: "Raccolta documenti sui materiali impiegati;" },
          { id: "st9", testo: "Deposito relazione a struttura ultimata;" },
          { id: "st10", testo: "Collaudo statico finale." },
        ],
      },
    ],
  },
];

// ── Blocchi di testo fisso di coda ───────────────────────────────────────────
// Ognuno è attivabile/disattivabile dal pannello.
export const BLOCCHI_FISSI = [
  {
    id: "tariffe",
    titolo: "TARIFFE PROFESSIONALI",
    paragrafi: [
      `Per tutte le attività richieste, non descritte nella precedente offerta e non stimate con costo forfettario, lo ${STUDIO_NOME} si riserva il diritto di esporre i seguenti costi orari previa la comunicazione al Committente:`,
    ],
    elenco: [
      "Partner / senior architect: 200,00 € / h (duecento/00) esclusi oneri fiscali e contributi integrativi;",
      "Collaboratore / junior architect: 100,00 € / h (cento/00) esclusi oneri fiscali e contributi integrativi.",
    ],
  },
  {
    id: "esclusioni",
    titolo: "ESCLUSIONI",
    paragrafi: [
      "Sono da considerarsi escluse dalla presente offerta i seguenti costi da versare al momento della richiesta agli enti interessati:",
    ],
    elenco: [
      "marche da bollo;",
      "diritti di segreteria comunale;",
      "oneri comunali;",
      "diritti catastali;",
      "presentazioni di varianti di progetto;",
      "costi di trasferta quali vitto, alloggio, trasporto e spese accessorie, che verranno accordati preventivamente con il Committente;",
      "tutto quanto non esplicitamente citato nella seguente offerta.",
    ],
  },
  {
    id: "diritti_autore",
    titolo: "DIRITTI D'AUTORE",
    paragrafi: [
      `La proprietà intellettuale ed i relativi diritti d'autore del progetto e di quanto altro rappresenta oggetto del presente contratto sono riservati allo ${STUDIO_NOME}, malgrado l'avvenuto pagamento del relativo compenso da parte del committente, a norma degli artt. 2575, 2576, 2577, 2578 del Codice civile, della legge 633/41 "protezione dei diritti d'autore e di altri diritti connessi al suo esercizio" e successive modifiche ed integrazioni.`,
      `Lo ${STUDIO_NOME} ha diritto di pubblicare tipi e fotografie dell'opera di cui è autore; il committente, per sé, eredi ed aventi causa, rilascia fin da ora il proprio consenso alla pubblicazione, rinunciando ad ogni corrispettivo e/o indennità, fermo restando in ogni caso il dovere dello ${STUDIO_NOME} di garantire al committente l'assoluta riservatezza dei dati relativi alla proprietà e alla ubicazione dell'intervento, che non saranno in alcun modo resi noti, fatta salva esplicita autorizzazione del committente.`,
      `Il committente che intendesse rendere pubblica l'opera progettata dall'architetto è tenuto a citare lo ${STUDIO_NOME}, salvo diversa disposizione dello stesso.`,
    ],
    elenco: [],
  },
  {
    id: "privacy",
    titolo: "PRIVACY",
    paragrafi: [
      `Ai sensi e per gli effetti dell'art. 13 del D.lgs. n. 196/2003 (Codice in materia di protezione dei dati personali), lo ${STUDIO_NOME} informa il Committente che il trattamento dei dati che Lo riguardano sarà improntato ai principi di correttezza, liceità e trasparenza e di tutela della Sua riservatezza e dei suoi diritti.`,
      "Il Professionista dichiara inoltre di essere stato informato dei soggetti, delle modalità e finalità di trattamento dei propri dati da parte del Committente e di essere a conoscenza dei diritti di cui all'art. 7 del medesimo D.lgs.",
      `Con la sottoscrizione del presente contratto, lo ${STUDIO_NOME} esprime il consenso affinché il Committente raccolga, conservi, utilizzi i dati di cui verrà in possesso ai fini contabili e fiscali connessi con l'adempimento del presente contratto.`,
      "Autorizza altresì il Committente a trasmettere tali dati a terzi qualificati, per adempimenti di legge e contrattuali.",
      `Lo ${STUDIO_NOME} si riserva di demandare, in funzione di supporto alla normale attività di elaborazione, lo svolgimento di particolari e/o specifiche operazioni a soggetti esterni che acquisiranno e/o elaboreranno dati esclusivamente per le finalità connesse alla costituzione, gestione ed esecuzione dei lavori di cui all'incarico conferito.`,
    ],
    elenco: [],
  },
  {
    id: "riservatezza",
    titolo: "RISERVATEZZA",
    paragrafi: [
      `Lo ${STUDIO_NOME} si impegna ad osservare, e a fare osservare ai suoi dipendenti e collaboratori, il massimo segreto su tutti i dati forniti dal Committente.`,
      `Lo ${STUDIO_NOME}, in particolare, dovrà mantenere la segretezza relativamente a disegni, specifiche e qualunque altro documento consegnatogli per l'esecuzione dei Servizi; tutta la documentazione fornita sarà conservata con riservatezza ed al termine dei Servizi sarà restituita al Committente.`,
      "Tutta la documentazione e le informazioni tecniche e commerciali fornite dal Committente dovranno essere considerate di carattere strettamente riservato.",
      "Esse non potranno quindi essere utilizzate per scopi diversi da quelli per i quali sono state fornite, salvo diversa esplicita autorizzazione scritta da parte del Committente a terzi per l'esecuzione del presente Contratto.",
    ],
    elenco: [],
  },
  {
    id: "scadenza",
    titolo: "TERMINI DI SCADENZA",
    paragrafi: [
      "La seguente offerta ha una validità di 60 giorni dalla data di emissione della presente comunicazione. Passata tale scadenza, l'offerta perderà la sua validità e potrà essere soggetta a riformulazione.",
    ],
    elenco: [],
  },
  {
    id: "assicurazione",
    titolo: "ASSICURAZIONE PROFESSIONALE",
    paragrafi: [
      `Sotto la propria responsabilità lo ${STUDIO_NOME} dichiara di essere in possesso della polizza assicurativa professionale con la compagnia Generali Italia Spa, numero polizza 430030781, massimale di euro 1.500.000,00.`,
    ],
    elenco: [],
  },
];

// ── Modalità di pagamento ────────────────────────────────────────────────────
// Rate di default dell'Opzione C (pagamento a stato avanzamento). Percentuali e
// descrizioni sono modificabili dal pannello e, all'accettazione dell'offerta,
// generano la suddivisione pagamenti (rate) della commessa.
export const RATE_C_DEFAULT = [
  { percentuale: 30, descrizione: "accettazione offerta" },
  { percentuale: 40, descrizione: "inizio lavori" },
  { percentuale: 30, descrizione: "presentazione SCIA commerciale e comunicazione fine lavori" },
];

// Costruisce il testo dell'Opzione C dalle rate: "30% accettazione offerta; …".
export function testoRateC(rate) {
  const list = Array.isArray(rate) && rate.length ? rate : RATE_C_DEFAULT;
  return list
    .map(r => `${Number(r.percentuale) || 0}% ${(r.descrizione || "").trim()}`.trim())
    .join("; ") + ".";
}

export const MODALITA_PAGAMENTO = [
  { id: "A", testo: "SALDO alla presentazione." },
  { id: "B", testo: "Saldo all'accettazione dell'offerta." },
  { id: "C", testo: testoRateC(RATE_C_DEFAULT), rate: true },
];

export const PAGAMENTO_CHIUSURA = "Pagamenti per rimessa diretta a mezzo di bonifico bancario o assegno bancario.";

// ── Testi di contorno ────────────────────────────────────────────────────────
export const TESTI = {
  copertinaSottotitolo: "Offerta di prestazioni professionali",
  oggetto: "OGGETTO: Offerta di prestazioni professionali.",
  saluti: "In attesa di un vostro cordiale riscontro porgiamo i nostri migliori saluti.",
  strutturaTitolo: "STRUTTURA DELL'OFFERTA",
  compensiTitolo: "COMPENSI E ONERI",
  totaleLabel: "TOTALE PARCELLA",
  pagamentiTitolo: "MODALITÀ E SCADENZE DI PAGAMENTO",
  accettazione: "LE PARTI PER ACCETTAZIONE:",
  accettazioneSx: "Il Committente",
  accettazioneDx: STUDIO_NOME,
  chiusuraNonConvenuto: "Per quanto non espressamente convenuto nella presente offerta sarà predisposto nuovo preventivo per accettazione da parte del Committente.",
};

// Lettera dell'indice: 0 → A, 1 → B, …
export const lettera = (i) => String.fromCharCode(65 + i);
