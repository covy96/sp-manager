// AUTO-GENERATO da xlsm CAP. BASE — categorie, premessa e costanti del capitolato.
// Rigenerare con lo script di estrazione se cambia il file base.
// I sottotitoli della premessa (es. ALLESTIMENTO CANTIERE) sono righe brevi in maiuscolo.

export const CAPITOLATO_CATEGORIE_TUTTE = [
  {
    "code": "A",
    "nome": "Opere provvisionali",
    "nomeIndice": "Opere provvisionali",
    "titoloPagina": "A) OPERE PROVVISIONALI"
  },
  {
    "code": "B",
    "nome": "Demolizioni",
    "nomeIndice": "Opere di demolizione",
    "titoloPagina": "B) OPERE DI DEMOLIZIONE"
  },
  {
    "code": "C",
    "nome": "Costruzioni",
    "nomeIndice": "Opere di costruzione",
    "titoloPagina": "C) OPERE DI COSTRUZIONE"
  },
  {
    "code": "D",
    "nome": "Abaco Porte e Serramenti",
    "nomeIndice": "Abaco Porte e Serramenti",
    "titoloPagina": "D) ABACO PORTE E SERRAMENTI"
  },
  {
    "code": "E",
    "nome": "Idrico-sanitario",
    "nomeIndice": "Impianto idrico-sanitario",
    "titoloPagina": "E) IMPIANTO IDRICO-SANITARIO"
  },
  {
    "code": "F",
    "nome": "Elettrico",
    "nomeIndice": "Impianto elettrico",
    "titoloPagina": "F) IMPIANTO ELETTRICO"
  },
  {
    "code": "G",
    "nome": "Meccanico",
    "nomeIndice": "Impianto meccanico",
    "titoloPagina": "G) IMPIANTO MECCANICO"
  },
  {
    "code": "H",
    "nome": "Pavimentazioni",
    "nomeIndice": "Pavimentazioni",
    "titoloPagina": "H) PAVIMENTAZIONI"
  },
  {
    "code": "I",
    "nome": "Rivestimenti a parete",
    "nomeIndice": "Rivestimenti a parete",
    "titoloPagina": "I) RIVESTIMENTI A PARETE"
  },
  {
    "code": "L",
    "nome": "Controsoffitti",
    "nomeIndice": "Controsoffitti",
    "titoloPagina": "L) RIVESTIMENTI A SOFFITTO"
  },
  {
    "code": "M",
    "nome": "Illuminazione",
    "nomeIndice": "Illuminazione",
    "titoloPagina": "M) FORNITURA LUCI"
  },
  {
    "code": "N",
    "nome": "Allestimenti",
    "nomeIndice": "Allestimenti",
    "titoloPagina": "N) ALLESTIMENTI"
  },
  {
    "code": "O",
    "nome": "Attrezzature",
    "nomeIndice": "Attrezzature",
    "titoloPagina": "O) ATTREZZATURE"
  },
  {
    "code": "P",
    "nome": "Arredi",
    "nomeIndice": "Arredi",
    "titoloPagina": "P) ARREDI"
  },
  {
    "code": "Q",
    "nome": "Arredi custom",
    "nomeIndice": "Arredi custom",
    "titoloPagina": "Q) ARREDI CUSTOM"
  },
  {
    "code": "R",
    "nome": "Insegne",
    "nomeIndice": "Insegne",
    "titoloPagina": "R) INSEGNE"
  },
  {
    "code": "S",
    "nome": "Esterno",
    "nomeIndice": "Opere esterne",
    "titoloPagina": "S) OPERE ESTERNE"
  }
];

// Sezioni tolte dalla libreria (2026-10): restano in CAPITOLATO_CATEGORIE_TUTTE solo
// perché i capitolati già compilati che le usano continuino a stamparle.
export const CAPITOLATO_CATEGORIE_RIMOSSE = ["M", "O"];

// Sezioni attive. `code` resta la chiave salvata nel database; `lettera` è la
// lettera mostrata, riassegnata in sequenza senza buchi (A…L, M = Allestimenti…).
const LETTERE_IT = "ABCDEFGHILMNOPQRSTUVZ".split("");
export const CAPITOLATO_CATEGORIE = CAPITOLATO_CATEGORIE_TUTTE
  .filter((c) => !CAPITOLATO_CATEGORIE_RIMOSSE.includes(c.code))
  .map((c, i) => {
    const lettera = LETTERE_IT[i] || c.code;
    const nome = c.titoloPagina.split(") ").slice(1).join(") ") || c.nomeIndice.toUpperCase();
    return { ...c, lettera, titoloPagina: `${lettera}) ${nome}` };
  });

const LETTERA_BY_CODE = Object.fromEntries(CAPITOLATO_CATEGORIE.map((c) => [c.code, c.lettera]));
export const letteraCategoria = (code) => LETTERA_BY_CODE[code] || code;

// I codici voce della libreria sono salvati con la lettera originale (es. N03 per
// Allestimenti): a video si mostrano con la lettera nuova (M03) e si riconvertono
// prima di salvare.
export function codiceVisibile(codice, cat) {
  const s = String(codice || "");
  const l = letteraCategoria(cat);
  if (!cat || l === cat) return s;
  const m = new RegExp(`^${cat}(\\d+)$`, "i").exec(s.trim());
  return m ? `${l}${m[1]}` : s;
}
export function codiceInterno(codice, cat) {
  const s = String(codice || "");
  const l = letteraCategoria(cat);
  if (!cat || l === cat) return s;
  const m = new RegExp(`^${l}(\\d+)$`, "i").exec(s.trim());
  return m ? `${cat}${m[1]}` : s;
}

export const CAPITOLATO_PREMESSA = [
  "Nel presente computo metrico a voci di capitolato estese sono descritte nel dettaglio le opere necessarie per l'esecuzione dei lavori.",
  "La descrizione delle opere può non contenere materiali accessori di dettaglio che devono comunque essere compresi, anche se non menzionati nei prezzi a corpo dei singoli componenti montati in opera a regola d'arte, onde consegnare le opere complete di tutto; pertanto nei prezzi relativi ad ogni singola voce si intendono compensati tutti indistintamente i materiali accessori e le opere complementari che, anche se non esplicitamente descritti, devono essere fornite per la posa a regola d'arte. Resta pertanto fin d'ora escluso il futuro riconoscimento di ogni e qualsiasi lavoro di completamento che fosse omesso per dimenticanza o per altre ragioni dall'offerta presentata. I particolari e le lavorazioni indicati sui disegni ma non menzionati nel seguente computo, o viceversa, dovranno essere eseguiti come se fossero menzionati nella stessa e indicati sui disegni. Ogni eventuale incongruenza deve essere segnalata dall'appaltatore prima dell'esecuzione.",
  "Nella quotazione sono compresi:\n- rilievi sul posto\n- progetto di cantiere\n- sottomissione per approvazione dei materiali\n- as-built\n- manuali uso e manutenzione\n- report fotografico ante e post lavori delle aree prese in consegna e limitrofe alle aree di cantiere\n- protezione con mezzo idoneo delle aree limitrofe alle aree di cantiere",
  "Tenuta del cantiere in stato di pulizia durante l'esecuzione dei lavori delle parti comuni di transito ove si rendesse necessario e pulizia finale delle aree oggetto di lavorazione e delle aree esterna. Compresa protezione di quanto consegnato e delle aree ed elementi limitrofi a quelli oggetto di cantiere. Compreso report fotografico dettagliato delle aree oggetto d’intervento o di transito delle maestranze o limitrofe, ante e post operazioni di demolizione, \nal fine di acclarare lo stato dei luoghi prima dell’allestimento del cantiere. \nPulizia di cantiere finale al fine dell'inserimento degli allestimenti. \nProtezione del pavimento finito con telo in plastica pesante e strato di tessuto non tessuto sottostante durante le opere di finitura."
];

export const CAPITOLATO_TITOLO = 'COMPUTO METRICO ESTIMATIVO';
export const CAPITOLATO_SOTTOTITOLO = 'COMPUTO OPERE EDILI\nIMPIANTISTICHE E DI FINITURE';
export const CAPITOLATO_NOTA_IVA = 'Prezzi esclusa I.V.A. di legge';
