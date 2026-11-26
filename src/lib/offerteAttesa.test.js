import { describe, it, expect } from "vitest";
import { giorniInAttesa, sogliaAttesa, offerteDaSollecitare } from "./offerteAttesa";

const oggi = new Date(2026, 10, 26); // 26 novembre 2026

describe("offerte in attesa", () => {
  it("conta i giorni dalla data offerta, poi dalla creazione", () => {
    expect(giorniInAttesa({ data_offerta: "2026-10-27" }, oggi)).toBe(30);
    expect(giorniInAttesa({ created_at: "2026-09-27T10:00:00" }, oggi)).toBe(60);
    expect(giorniInAttesa({}, oggi)).toBe(null);
  });

  it("soglie 30 e 60", () => {
    expect(sogliaAttesa(29)).toBe(0);
    expect(sogliaAttesa(30)).toBe(30);
    expect(sogliaAttesa(59)).toBe(30);
    expect(sogliaAttesa(60)).toBe(60);
    expect(sogliaAttesa(null)).toBe(0);
  });

  it("solo offerte in attesa da 30+ giorni, dalla più vecchia", () => {
    const lista = offerteDaSollecitare([
      { id: 1, stato: "offerta", data_offerta: "2026-11-20" },
      { id: 2, stato: "offerta", data_offerta: "2026-10-20" },
      { id: 3, stato: "accettata", data_offerta: "2026-01-01" },
      { id: 4, stato: "offerta", data_offerta: "2026-08-01" },
      { id: 5, stato: "rifiutata", data_offerta: "2026-01-01" },
      { id: 6, stato: "offerta", data_offerta: "2026-01-01", deleted_at: "2026-02-01" },
    ], oggi);
    expect(lista.map(o => [o.id, o.soglia])).toEqual([[4, 60], [2, 30]]);
  });
});
