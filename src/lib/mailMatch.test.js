import { describe, it, expect } from "vitest";
import { matchProject, cleanSubject } from "./mailMatch";

const projects = [
  { id: "p1", name: "Villa Bianchi", client: "Mario Bianchi", address: "Via Roma 12, Milano" },
  { id: "p2", name: "Negozio Corso Como", client: "Fashion Srl", address: "Corso Como 5, Milano" },
  { id: "p3", name: "Uffici Rossi", client: "Rossi Spa", address: "Piazza Duomo 1, Milano" },
];
const contacts = [
  { project_id: "p1", email: "m.bianchi@gmail.com" },
  { project_id: "p2", email: "info@impresa.it" },
  { project_id: "p3", email: "info@impresa.it" },
];

describe("matchProject", () => {
  it("riconosce il mittente come contatto del progetto", () => {
    const r = matchProject({ subject: "Domanda", body: "ciao", participants: ["M.Bianchi@gmail.com"] }, projects, contacts);
    expect(r.projectId).toBe("p1");
  });

  it("riconosce il nome del progetto nell'oggetto, anche con RE:", () => {
    const r = matchProject({ subject: "RE: sopralluogo villa bianchi", body: "", participants: ["x@y.it"] }, projects, contacts);
    expect(r.projectId).toBe("p1");
  });

  it("indirizzo + cliente nel testo bastano", () => {
    const r = matchProject({ subject: "Consegna", body: "Per Fashion srl, consegna in Corso Como 5 lunedì", participants: [] }, projects, contacts);
    expect(r.projectId).toBe("p2");
  });

  it("contatto su più progetti: decide il testo, altrimenti incerto", () => {
    expect(matchProject({ subject: "Preventivo", body: "", participants: ["info@impresa.it"] }, projects, contacts).projectId).toBeNull();
    expect(matchProject({ subject: "Preventivo uffici Rossi", body: "", participants: ["info@impresa.it"] }, projects, contacts).projectId).toBe("p3");
  });

  it("solo il nome nel testo non basta", () => {
    const r = matchProject({ subject: "Aggiornamento", body: "come per villa bianchi", participants: [] }, projects, contacts);
    expect(r.projectId).toBeNull();
    expect(r.candidates[0].id).toBe("p1");
  });

  it("nessuna corrispondenza", () => {
    expect(matchProject({ subject: "Newsletter", body: "offerte", participants: ["news@shop.it"] }, projects, contacts))
      .toMatchObject({ projectId: null, reason: "nessun progetto riconosciuto" });
  });
});

describe("cleanSubject", () => {
  it("toglie i prefissi di risposta e inoltro", () => {
    expect(cleanSubject("RE: R: Fwd: Sopralluogo")).toBe("Sopralluogo");
    expect(cleanSubject("I: Verbale")).toBe("Verbale");
  });
});
