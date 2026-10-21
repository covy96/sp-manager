import { describe, it, expect } from "vitest";
import { parseRich, richToPlain, richToHtml, normalizeRich, isRich, wrapRuns, RICH_AUTO } from "./richText";

describe("richText", () => {
  it("testo semplice resta com'è", () => {
    const s = "Demolizione di tramezzi h < 3 m & simili\nseconda riga";
    expect(isRich(s)).toBe(false);
    expect(normalizeRich(s)).toBe(s);
    expect(richToPlain(s)).toBe(s);
    expect(richToHtml(s)).toBe("Demolizione di tramezzi h &lt; 3 m &amp; simili<br>seconda riga");
  });

  it("grassetto, corsivo e colore dall'editor (Chrome)", () => {
    const html = 'Posa <b>in opera</b> di <i>pavimento</i> <font color="#d0312d">escluso</font>';
    expect(parseRich(html)).toEqual([
      { text: "Posa ", b: false, i: false, color: null },
      { text: "in opera", b: true, i: false, color: null },
      { text: " di ", b: false, i: false, color: null },
      { text: "pavimento", b: false, i: true, color: null },
      { text: " ", b: false, i: false, color: null },
      { text: "escluso", b: false, i: false, color: "#d0312d" },
    ]);
    expect(normalizeRich(html)).toBe('Posa <b>in opera</b> di <i>pavimento</i> <span style="color:#d0312d">escluso</span>');
  });

  it("span con stile (Safari/Firefox) e rgb()", () => {
    const html = '<span style="font-weight: 700; color: rgb(31, 111, 209);">blu</span>';
    expect(parseRich(html)).toEqual([{ text: "blu", b: true, i: false, color: "#1f6fd1" }]);
  });

  it("sanitizza: niente script, attributi o tag non ammessi", () => {
    const html = '<b onclick="x()">ok</b><script>alert(1)</script><img src=x onerror=alert(1)>';
    const out = normalizeRich(html);
    expect(out).toBe("<b>ok</b>alert(1)");
    expect(out).not.toMatch(/script|img|onclick|onerror/);
  });

  it("a capo con br e div, br finale ignorato", () => {
    expect(richToPlain("a<br>b<br>")).toBe("a\nb");
    expect(richToPlain("a<br><br>")).toBe("a\n");
    expect(richToPlain("<b>a</b><div>b</div>")).toBe("a\nb");
    expect(richToHtml("<b>a</b><br><br>", { editor: true })).toBe("<b>a</b><br><br>");
  });

  it("colore automatico = nessun colore; senza formattazione torna testo semplice", () => {
    expect(normalizeRich(`<font color="${RICH_AUTO}">testo &amp; altro</font>`)).toBe("testo & altro");
    expect(normalizeRich("uno&nbsp; due &amp; tre", { html: true })).toBe("uno  due & tre");
    expect(normalizeRich("uno&nbsp; due")).toBe("uno&nbsp; due"); // testo semplice salvato: intoccabile
  });

  it("wrapRuns spezza sulle parole mantenendo gli stili", () => {
    const runs = parseRich("aaa <b>bbb ccc</b> ddd");
    const lines = wrapRuns(runs, 7, (t) => t.length);
    expect(lines.map((l) => l.map((s) => s.text).join("|"))).toEqual(["aaa |bbb", "ccc| ddd"]);
    expect(lines[0][1].b).toBe(true);
  });
});
