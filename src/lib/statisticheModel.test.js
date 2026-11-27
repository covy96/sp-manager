import { describe, it, expect } from "vitest";
import { parseDay, calcolaIncassiPrevisti, calcolaTempiIncasso, calcolaFatturato, calcolaOreProgetti, calcolaCantieri, ripartisciProforma } from "./statisticheModel";

const oggi = new Date(2026, 10, 27); // 27 nov 2026
const commesse = [
  { id: "c1", cliente: "Rossi", nome_commessa: "Villa", importo_offerta_base: 10000, project_id: "p1" },
  { id: "c2", cliente: "Bianchi", nome_commessa: "Uffici", importo_offerta_base: 4000, project_id: "p2" },
  { id: "c3", cliente: "Verdi", nome_commessa: "Vecchia", importo_offerta_base: 1000, archived: true },
];
const rate = [
  { id: "r1", commessa_id: "c1", percentuale: 30, pagato: true },
  { id: "r2", commessa_id: "c1", percentuale: 30, pagato: false },
  { id: "r3", commessa_id: "c1", percentuale: 40, pagato: false },
  { id: "r4", commessa_id: "c2", importo_fisso: 4000, pagato: false },
  { id: "r5", commessa_id: "c3", percentuale: 100, pagato: false },
];
const proforma = [
  { id: "pf1", commessa_id: "c1", importo_totale: 3000, pagato: true, data_creazione: "2026-03-01", data_scadenza: "2026-03-31", data_pagamento: "2026-04-10", suddivisione_pagamento_ids: ["r1"] },
  { id: "pf2", commessa_id: "c1", importo_totale: 3200, pagato: false, data_creazione: "2026-11-01", data_scadenza: "2026-12-15", suddivisione_pagamento_ids: ["r2"] },
  { id: "pf3", commessa_id: "c2", importo_totale: 4000, pagato: false, data_creazione: "2026-09-01", data_scadenza: "2026-10-01", suddivisione_pagamento_ids: ["r4"] },
];

describe("parseDay", () => {
  it("legge YYYY-MM-DD come giorno locale", () => {
    const d = parseDay("2026-12-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 1]);
  });
});

describe("incassi previsti", () => {
  const r = calcolaIncassiPrevisti({ commesse, rate, proforma, oggi });
  it("mette le proforma non pagate nel mese di scadenza", () => {
    expect(r.mesi[0].label).toBe("Nov 26");
    expect(r.mesi[1].importo).toBe(3200);
  });
  it("separa le scadute", () => {
    expect(r.totScaduto).toBe(4000);
    expect(r.scadute[0].giorni).toBe(57);
  });
  it("rate da fatturare: escluse quelle in proforma e delle commesse archiviate", () => {
    expect(r.totDaFatturare).toBe(4000); // r3 = 40% di 10000
  });
});

describe("tempi incasso", () => {
  it("calcola giorni emissione→pagamento e ritardo sulla scadenza", () => {
    const t = calcolaTempiIncasso({ commesse, proforma, anno: 2026 });
    expect(t.mediaIncasso).toBe(40);
    expect(t.mediaRitardo).toBe(10);
    expect(t.pctInRitardo).toBe(100);
  });
});

describe("fatturato", () => {
  it("per cliente e per prestazione dalle voci dell'offerta", () => {
    const offerte = [{ commessa_id: "c1", stato: "accettata", importo_offerta_base: 10000, voci: [{ nome: "Progetto", prezzo: 6000 }, { nome: "DL", prezzo: 4000 }] }];
    const f = calcolaFatturato({ commesse, rate, proforma, offerte, anno: 2026 });
    expect(f.totFatt).toBe(10200);
    expect(f.totInc).toBe(3000);
    expect(f.perCliente[0].cliente).toBe("Rossi");
    const prog = f.perPrestazione.find(p => p.nome === "Progetto");
    expect(Math.round(prog.fatturato)).toBe(3720); // 60% di 6200
    expect(f.perPrestazione.find(p => p.nome === "Senza offerta collegata").fatturato).toBe(4000);
    expect(f.andamento[2].fatturato).toBe(3000);
    expect(f.andamento[3].incassato).toBe(3000);
  });
  it("ripartisce una proforma multi-commessa e il resto alla principale", () => {
    const p = { commessa_id: "c1", importo_totale: 7500, suddivisione_pagamento_ids: ["r2", "r4"] };
    const byId = Object.fromEntries(rate.map(r => [r.id, r]));
    const cb = Object.fromEntries(commesse.map(c => [c.id, c]));
    expect(ripartisciProforma(p, byId, cb)).toEqual({ c1: 3500, c2: 4000 });
  });
});

describe("ore progetti", () => {
  it("€/ora, budget e sforamenti", () => {
    const projects = [{ id: "p1", name: "Villa", budget_ore: 100 }, { id: "p2", name: "Uffici" }];
    const r = calcolaOreProgetti({ projects, commesse, orePerProgetto: { p1: 120, p2: 40 }, soglia: 90 });
    const villa = r.righe.find(x => x.id === "p1");
    expect(Math.round(villa.euroOra)).toBe(83);
    expect(villa.oltreBudget).toBe(true);
    expect(villa.sottoSoglia).toBe(true);
    expect(r.righe.find(x => x.id === "p2").sfora).toBe(false);
    expect(Math.round(r.euroOraMedio)).toBe(88);
  });
});

describe("cantieri", () => {
  it("usa l'ultima versione del Gantt e segnala i cantieri senza report", () => {
    const projects = [{ id: "p1", name: "Villa" }];
    const versions = [{ id: "v1", project_id: "p1", created_at: "2026-01-01" }, { id: "v2", project_id: "p1", created_at: "2026-05-01" }];
    const lavorazioni = [
      { project_id: "p1", version_id: "v1", data_inizio: "2025-01-01", data_fine: "2025-02-01" },
      { project_id: "p1", version_id: "v2", data_inizio: "2026-11-01", data_fine: "2026-12-10", operatore: "Edil Srl", descrizione: "Scavi" },
    ];
    const reports = [{ project_id: "p1", data_ora: "2026-11-01T09:00:00+00:00" }];
    const pratiche = [{ id: "x", project_id: "p1", tipo_pratica: "CILA", note: JSON.stringify({ note: "", scadenza: { data: "2026-12-05", label: "Integrazioni" } }) }];
    const r = calcolaCantieri({ projects, versions, lavorazioni, reports, pratiche, oggi });
    expect(r.cantieri[0].stato).toBe("in_corso");
    expect(r.cantieri[0].inizio.getFullYear()).toBe(2026);
    expect(r.cantieri[0].senzaReport).toBe(true);
    expect(r.imprese[0].impresa).toBe("Edil Srl");
    expect(r.scadenze[0].giorni).toBe(8);
    expect(r.nFineEntro30).toBe(1);
  });
});
