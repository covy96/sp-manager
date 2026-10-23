import { describe, it, expect } from "vitest";
import { findMailDates, firstTime } from "./mailDates";

// Venerdì 23 ottobre 2026
const REF = new Date(2026, 9, 23, 9, 0);

describe("findMailDates", () => {
  it("riconosce date numeriche con orario", () => {
    expect(findMailDates("Sopralluogo il 12/11/2026 alle 10:30 in cantiere", REF))
      .toEqual([{ date: "2026-11-12", time: "10:30", match: "12/11/2026" }]);
  });

  it("anno a due cifre e senza anno", () => {
    expect(findMailDates("consegna 05-01-27", REF)[0].date).toBe("2027-01-05");
    expect(findMailDates("ci vediamo il 3/11", REF)[0].date).toBe("2026-11-03");
    // data già passata nell'anno → anno successivo
    expect(findMailDates("riunione il 2/2", REF)[0].date).toBe("2027-02-02");
  });

  it("mesi scritti in lettere", () => {
    const r = findMailDates("Riunione 4 novembre ore 15 e consegna 20 dic. 2026", REF);
    expect(r).toEqual([
      { date: "2026-11-04", time: "15:00", match: "4 novembre" },
      { date: "2026-12-20", time: null, match: "20 dic. 2026" },
    ]);
  });

  it("domani e giorni della settimana", () => {
    expect(findMailDates("Ci sentiamo domani alle 9", REF)[0]).toEqual({ date: "2026-10-24", time: "09:00", match: "domani" });
    expect(findMailDates("lunedì in studio", REF)[0].date).toBe("2026-10-26");
    expect(findMailDates("giovedi prossimo", REF)[0].date).toBe("2026-10-29");
  });

  it("non scambia orari o numeri per date", () => {
    expect(findMailDates("alle 10.30 arrivo", REF)).toEqual([]);
    expect(findMailDates("importo 1.234,56 euro, 31/02/2026", REF)).toEqual([]);
  });

  it("toglie i duplicati", () => {
    expect(findMailDates("12/11/2026 ... confermo 12/11/2026", REF)).toHaveLength(1);
  });
});

describe("firstTime", () => {
  it("trova il primo orario", () => {
    expect(firstTime("vediamoci verso le 14:15 o alle 16")).toBe("14:15");
    expect(firstTime("ore 9")).toBe("09:00");
    expect(firstTime("nessun orario")).toBeNull();
  });
});
