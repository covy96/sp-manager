// Test unitari della logica di calcolo del capitolato (funzioni pure, niente rete).
// Lancia con: npm test
import { describe, it, expect, vi } from "vitest";

// capitolatoModel importa ./supabase, che crea il client all'import (e lancia se
// mancano le env). Le funzioni testate sono pure e non usano il client: lo stubbiamo
// così i test non dipendono da env né rete. (vi.mock è hoistato sopra gli import.)
vi.mock("./supabase", () => ({ supabase: {} }));

import {
  fmtNum, parseNum, parseMisura, qtaMisurazione, totaleRiga, totaleRigaEff,
  rigaFromVoce, defaultSommanoLabels, componiGruppi, ALFABETO_IT,
  assistenzaPerc, assistenzaLabel,
} from "./capitolatoModel";

describe("fmtNum", () => {
  it("formatta in stile italiano a 2 decimali", () => {
    expect(fmtNum(15)).toBe("15,00");
    expect(fmtNum(2.13)).toBe("2,13");
  });
  it("aggiunge il separatore delle migliaia", () => {
    expect(fmtNum(1234.5)).toBe("1.234,50");
    expect(fmtNum(1000000)).toBe("1.000.000,00");
  });
  it("gestisce i negativi e i decimali richiesti", () => {
    expect(fmtNum(-3.5)).toBe("-3,50");
    expect(fmtNum(3, 0)).toBe("3");
  });
  it("ritorna stringa vuota per valori non numerici", () => {
    expect(fmtNum("")).toBe("");
    expect(fmtNum(NaN)).toBe("");
    expect(fmtNum(undefined)).toBe("");
  });
});

describe("parseNum", () => {
  it("accetta la virgola italiana e il punto", () => {
    expect(parseNum("2,13")).toBe(2.13);
    expect(parseNum("2.13")).toBe(2.13);
    expect(parseNum(5)).toBe(5);
  });
  it("ritorna NaN per vuoto/null", () => {
    expect(parseNum("")).toBeNaN();
    expect(parseNum(null)).toBeNaN();
    expect(parseNum(undefined)).toBeNaN();
  });
});

describe("parseMisura (espressioni nei campi misura)", () => {
  it("valuta somme, con o senza '=' e con virgola o punto", () => {
    expect(parseMisura("=3,45+2,4")).toBeCloseTo(5.85);
    expect(parseMisura("3.45+2.4")).toBeCloseTo(5.85);
    expect(parseMisura("=1+2+3+4")).toBe(10);
  });
  it("supporta -, *, / e le parentesi (precedenza corretta)", () => {
    expect(parseMisura("10-2,5")).toBe(7.5);
    expect(parseMisura("2+3*4")).toBe(14);
    expect(parseMisura("(2+3)*4")).toBe(20);
    expect(parseMisura("6/2")).toBe(3);
  });
  it("resta compatibile col numero singolo", () => {
    expect(parseMisura("2,13")).toBe(2.13);
    expect(parseMisura(5)).toBe(5);
    expect(parseMisura("")).toBeNaN();
  });
  it("su input non valido non lancia (ricade su parseNum)", () => {
    expect(parseMisura("ciao")).toBeNaN();
    expect(parseMisura("2++")).toBeNaN();
  });
});

describe("qtaMisurazione con espressioni", () => {
  it("somma nella dimensione: =3,45+2,4 come Lung.", () => {
    expect(qtaMisurazione({ lung: "=3,45+2,4" })).toBeCloseTo(5.85);
  });
  it("moltiplica dimensioni-espressione: (2+1) x 0,5", () => {
    expect(qtaMisurazione({ lung: "2+1", larg: "0,5" })).toBe(1.5);
  });
  it("espressione nella quantità manuale", () => {
    expect(qtaMisurazione({ qta: "=10+5" })).toBe(15);
  });
});

describe("assistenzaPerc / assistenzaLabel (% per impianto)", () => {
  it("legge la % del singolo impianto da percs", () => {
    const a = { basi: ["F", "G"], percs: { F: 10, G: 5 } };
    expect(assistenzaPerc(a, "F")).toBe(10);
    expect(assistenzaPerc(a, "G")).toBe(5);
  });
  it("ricade sul vecchio perc unico (retrocompatibile)", () => {
    const a = { basi: ["F", "G"], perc: 8 };
    expect(assistenzaPerc(a, "F")).toBe(8);
    expect(assistenzaPerc(a, "G")).toBe(8);
  });
  it("% vuota quando non impostata", () => {
    expect(assistenzaPerc({ basi: ["F"], percs: {} }, "F")).toBe("");
    expect(assistenzaPerc({ basi: ["F"], percs: { F: "" } }, "F")).toBe("");
  });
  it("l'etichetta mostra la % di ciascun impianto", () => {
    const a = { basi: ["F", "G"], percs: { F: 10, G: 5 } };
    expect(assistenzaLabel(a)).toBe("Assistenza muraria — Impianto elettrico 10%, Impianto meccanico 5%");
  });
});

describe("qtaMisurazione", () => {
  it("moltiplica le dimensioni compilate (Lung x Larg x H)", () => {
    expect(qtaMisurazione({ lung: "2", larg: "3", hpeso: "" })).toBe(6);
    expect(qtaMisurazione({ lung: "2", larg: "3", hpeso: "4" })).toBe(24);
  });
  it("accetta la virgola italiana nelle dimensioni", () => {
    expect(qtaMisurazione({ lung: "2,5", larg: "2", hpeso: "" })).toBe(5);
  });
  it("usa la quantità manuale se non ci sono dimensioni", () => {
    expect(qtaMisurazione({ qta: "4" })).toBe(4);
    expect(qtaMisurazione({ qta: "2,5" })).toBe(2.5);
  });
  it("ritorna 0 se non c'è nulla di valido", () => {
    expect(qtaMisurazione({})).toBe(0);
    expect(qtaMisurazione({ qta: "" })).toBe(0);
  });
});

describe("totaleRiga / totaleRigaEff", () => {
  const riga = { misurazioni: [{ lung: "1", larg: "2,5" }, { qta: "6" }] };
  it("somma le quantità di tutte le misurazioni", () => {
    expect(totaleRiga(riga)).toBe(8.5);
  });
  it("una voce 'a corpo' vale sempre almeno 1", () => {
    expect(totaleRigaEff({ unita: "a corpo", misurazioni: [] })).toBe(1);
    expect(totaleRigaEff({ unita: "A CORPO", misurazioni: [{ qta: "" }] })).toBe(1);
  });
  it("una voce 'a corpo' con misure reali usa il totale calcolato", () => {
    expect(totaleRigaEff({ unita: "a corpo", misurazioni: [{ qta: "3" }] })).toBe(3);
  });
  it("una voce non 'a corpo' resta 0 se vuota", () => {
    expect(totaleRigaEff({ unita: "mq", misurazioni: [] })).toBe(0);
  });
});

describe("rigaFromVoce", () => {
  it("prefilla qta=1 per le voci 'a corpo'", () => {
    const r = rigaFromVoce({ id: "v1", unita: "a corpo", categoria_code: "A" });
    expect(r.misurazioni[0].qta).toBe("1");
    expect(totaleRigaEff(r)).toBe(1);
  });
  it("non prefilla la qta per le altre unità", () => {
    const r = rigaFromVoce({ id: "v2", unita: "mq", categoria_code: "B" });
    expect(r.misurazioni[0].qta).toBe("");
  });
});

describe("defaultSommanoLabels", () => {
  it("voce singola: una sola etichetta SOMMANO", () => {
    expect(defaultSommanoLabels("mq", "singolo")).toEqual(["SOMMANO mq"]);
  });
  it("fornitura+posa: due etichette", () => {
    expect(defaultSommanoLabels("cad", "fornitura_posa"))
      .toEqual(["FORNITURA - sommano cad", "POSA - sommano cad"]);
  });
});

describe("componiGruppi (re-letterazione)", () => {
  it("riassegna le lettere in sequenza saltando le categorie mancanti", () => {
    // Uso categorie non contigue: A e C -> devono diventare A e B.
    const righe = [
      { categoria_code: "A", titolo: "x" },
      { categoria_code: "C", titolo: "y" },
      { categoria_code: "C", titolo: "z" },
    ];
    const g = componiGruppi(righe);
    expect(g.map((x) => x.code)).toEqual(["A", "B"]);
    expect(g[0].items[0]._code).toBe("A01");
    expect(g[1].items[0]._code).toBe("B01");
    expect(g[1].items[1]._code).toBe("B02");
  });
  it("conserva la categoria di origine", () => {
    const g = componiGruppi([{ categoria_code: "C", titolo: "y" }]);
    expect(g[0].originalCode).toBe("C");
    expect(g[0].code).toBe("A"); // prima categoria usata -> lettera A
  });
});

describe("ALFABETO_IT", () => {
  it("salta J, K, W, X, Y", () => {
    expect(ALFABETO_IT.includes("J")).toBe(false);
    expect(ALFABETO_IT.includes("K")).toBe(false);
    expect(ALFABETO_IT.join("")).toBe("ABCDEFGHILMNOPQRSTUVZ");
  });
});
