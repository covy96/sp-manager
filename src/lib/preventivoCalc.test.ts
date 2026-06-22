import { describe, it, expect } from "vitest";
import { tariffaSettimanale, calcPreventivo } from "./preventivoCalc";

const SCAGLIONI = [
  { soglia_max: 100_000, tariffa_settimanale: 250 },
  { soglia_max: 300_000, tariffa_settimanale: 350 },
  { soglia_max: null,    tariffa_settimanale: 500 },
];

describe("tariffaSettimanale", () => {
  it("primo scaglione (< 100k)", () => {
    expect(tariffaSettimanale(50_000, SCAGLIONI)).toBe(250);
  });
  it("esatto al limite superiore del primo scaglione", () => {
    expect(tariffaSettimanale(100_000, SCAGLIONI)).toBe(250);
  });
  it("secondo scaglione (100k < x <= 300k)", () => {
    expect(tariffaSettimanale(200_000, SCAGLIONI)).toBe(350);
  });
  it("fascia oltre (soglia_max = null)", () => {
    expect(tariffaSettimanale(500_000, SCAGLIONI)).toBe(500);
  });
  it("importo zero → primo scaglione", () => {
    expect(tariffaSettimanale(0, SCAGLIONI)).toBe(250);
  });
  it("scaglioni disordinati: ordina comunque correttamente", () => {
    const disorderly = [...SCAGLIONI].reverse();
    expect(tariffaSettimanale(50_000, disorderly)).toBe(250);
    expect(tariffaSettimanale(500_000, disorderly)).toBe(500);
  });
});

describe("calcPreventivo", () => {
  it("calcola tutti i totali correttamente", () => {
    const out = calcPreventivo({
      mq: 100,
      tariffa_mq: 80,
      importo_lavori: 200_000,
      durata_settimane: 10,
      dl_scaglioni: SCAGLIONI,
      voci_fisse: [{ importo: 500 }, { importo: 300 }],
      rivalsa_inarcassa_pct: 4,
    });
    expect(out.tot_progettazione).toBe(8_000);   // 100 × 80
    expect(out.tariffa_settimanale).toBe(350);   // secondo scaglione
    expect(out.tot_dl).toBe(3_500);              // 10 × 350
    expect(out.tot_fisse).toBe(800);             // 500 + 300
    expect(out.imponibile).toBe(12_300);         // 8000 + 3500 + 800
    expect(out.rivalsa_inarcassa).toBeCloseTo(492);   // 12300 × 4%
    expect(out.totale).toBeCloseTo(12_792);      // 12300 + 492
  });

  it("senza voci fisse", () => {
    const out = calcPreventivo({
      mq: 50, tariffa_mq: 100,
      importo_lavori: 50_000, durata_settimane: 8,
      dl_scaglioni: SCAGLIONI,
      voci_fisse: [],
      rivalsa_inarcassa_pct: 4,
    });
    expect(out.tot_progettazione).toBe(5_000);
    expect(out.tariffa_settimanale).toBe(250);
    expect(out.tot_dl).toBe(2_000);
    expect(out.tot_fisse).toBe(0);
    expect(out.imponibile).toBe(7_000);
  });
});
