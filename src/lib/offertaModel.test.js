// Test unitari della duplicazione offerta (funzioni pure, niente rete).
import { describe, it, expect } from "vitest";
import { prossimoNumeroOfferta, datiDuplicaOfferta, ordinaOfferte, normalizzaDocumento as _norm } from "./offertaModel";
import { testoVoce, voceModificata } from "./offertaTemplate";

describe("prossimoNumeroOfferta", () => {
  it("incrementa mantenendo gli zeri", () => {
    expect(prossimoNumeroOfferta("2026/014")).toBe("2026/015");
    expect(prossimoNumeroOfferta("OFF.009")).toBe("OFF.010");
  });
  it("non incrementa l'anno", () => {
    expect(prossimoNumeroOfferta("15/2026")).toBe("16/2026");
    expect(prossimoNumeroOfferta("OFF-2026")).toBe("OFF-2027");
  });
  it("salta i numeri già usati", () => {
    expect(prossimoNumeroOfferta("2026/014", ["2026/015", "2026/016"])).toBe("2026/017");
  });
  it("senza cifre aggiunge un suffisso", () => {
    expect(prossimoNumeroOfferta("ABC", ["ABC-2"])).toBe("ABC-3");
  });
});

describe("datiDuplicaOfferta", () => {
  const originale = {
    id: "x", created_at: "2026-01-01", commessa_id: "c1", deleted_at: null,
    studio: "s", numero_offerta: "2026/003", nome_offerta: "Villa Rossi", cliente: "Rossi",
    project_id: "p1", stato: "accettata", data_offerta: "2026-01-01",
    voci: [{ id: "v1", nome: "Progetto", prezzo: 1000, attiva: true }], sconto: 10,
    documento: { data: "2026-01-01", sezioni: { a: { attiva: true } } },
    documento_versioni: [{ n: 3 }, { n: 2 }, { n: 1 }],
  };
  const copia = datiDuplicaOfferta(originale, ["2026/003"], "2026-10-20");

  it("toglie identità ed esito", () => {
    expect(copia.id).toBeUndefined();
    expect(copia.created_at).toBeUndefined();
    expect(copia.commessa_id).toBeUndefined();
    expect(copia.stato).toBe("offerta");
  });
  it("copia voci e documento come oggetti nuovi", () => {
    expect(copia.voci).toEqual(originale.voci);
    expect(copia.voci[0]).not.toBe(originale.voci[0]);
    expect(copia.documento.sezioni).toEqual(originale.documento.sezioni);
    expect(copia.documento.data).toBe("2026-10-20");
    expect(originale.documento.data).toBe("2026-01-01");
    expect(copia.documento_versioni).toHaveLength(1);
  });
  it("nuovo numero, nome e data", () => {
    expect(copia.numero_offerta).toBe("2026/004");
    expect(copia.nome_offerta).toBe("Villa Rossi (copia)");
    expect(copia.data_offerta).toBe("2026-10-20");
    expect(copia.cliente).toBe("Rossi");
    expect(copia.sconto).toBe(10);
  });
});

describe("ordinaOfferte", () => {
  const lista = [
    { id: "a", numero_offerta: "2026/002", created_at: "2026-03-01T10:00:00Z" },
    { id: "b", numero_offerta: "2026/010", created_at: "2026-01-01T10:00:00Z" },
    { id: "c", numero_offerta: "2025/099", created_at: "2026-05-01T10:00:00Z" },
  ];
  it("per creazione: più recenti prima", () => {
    expect(ordinaOfferte(lista, "creazione").map((o) => o.id)).toEqual(["c", "a", "b"]);
  });
  it("per numero: anno poi progressivo, più alti prima", () => {
    expect(ordinaOfferte(lista, "numero").map((o) => o.id)).toEqual(["b", "a", "c"]);
    expect(ordinaOfferte(lista, "numero", "asc").map((o) => o.id)).toEqual(["c", "a", "b"]);
  });
  it("numeri con anno in fondo o prefisso", () => {
    const l = [{ id: "x", numero_offerta: "9/2026" }, { id: "y", numero_offerta: "12/2026" }, { id: "z", numero_offerta: "30/2025" }];
    expect(ordinaOfferte(l, "numero").map((o) => o.id)).toEqual(["y", "x", "z"]);
    const p = [{ id: "1", numero_offerta: "OFF.9" }, { id: "2", numero_offerta: "OFF.10" }];
    expect(ordinaOfferte(p, "numero").map((o) => o.id)).toEqual(["2", "1"]);
  });
  it("non modifica la lista originale", () => {
    ordinaOfferte(lista, "numero");
    expect(lista[0].id).toBe("a");
  });
});

// ── Testo voce modificato per singola offerta ───────────────────────────────

describe("testoVoce", () => {
  const v = { id: "x", testo: "Presentazione di n° «_» pratiche." };
  it("usa il testo standard con i campi compilati se non modificato", () => {
    expect(testoVoce(v, { campi: { f0: "2" } })).toBe("Presentazione di n° 2 pratiche.");
    expect(voceModificata({ campi: {} })).toBe(false);
  });
  it("usa il testo riscritto per l'offerta, con gli a capo", () => {
    const vc = { campi: { f0: "2" }, testoLibero: "Testo mio\nseconda riga" };
    expect(testoVoce(v, vc)).toBe("Testo mio\nseconda riga");
    expect(voceModificata(vc)).toBe(true);
  });
  it("testo riscritto vuoto torna al testo standard", () => {
    expect(testoVoce(v, { campi: {}, testoLibero: "   " })).toBe("Presentazione di n° _ pratiche.");
  });
  it("il testo riscritto sopravvive alla normalizzazione del documento", () => {
    const base = _norm(null, {});
    const sid = Object.keys(base.sezioni)[0];
    const vid = Object.keys(base.sezioni[sid].voci)[0];
    const salvato = { ...base, sezioni: { ...base.sezioni, [sid]: { ...base.sezioni[sid], voci: { ...base.sezioni[sid].voci, [vid]: { ...base.sezioni[sid].voci[vid], testoLibero: "Solo qui" } } } } };
    expect(_norm(JSON.parse(JSON.stringify(salvato)), {}).sezioni[sid].voci[vid].testoLibero).toBe("Solo qui");
  });
});
