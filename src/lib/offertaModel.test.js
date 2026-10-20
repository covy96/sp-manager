// Test unitari della duplicazione offerta (funzioni pure, niente rete).
import { describe, it, expect } from "vitest";
import { prossimoNumeroOfferta, datiDuplicaOfferta } from "./offertaModel";

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
