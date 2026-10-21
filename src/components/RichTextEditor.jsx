// Editor di testo con grassetto, corsivo e colore per le descrizioni del
// capitolato, più il componente che le mostra. Il valore è quello di
// lib/richText: testo semplice se non c'è formattazione, altrimenti HTML ripulito.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { normalizeRich, richToHtml, RICH_COLORI, RICH_AUTO } from "../lib/richText";

const CSS = `
.rt-edit:empty:before { content: attr(data-placeholder); opacity: .45; pointer-events: none; }
.rt-edit font[color="${RICH_AUTO}"] { color: inherit; }
.rt-edit:focus { outline: none; }
`;
let cssMesso = false;
function useCss() {
  useEffect(() => {
    if (cssMesso || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = CSS; document.head.appendChild(el); cssMesso = true;
  }, []);
}

// Testo formattato in sola lettura (anteprime, liste).
export function RichText({ value, style, className }) {
  return <span className={className} style={{ whiteSpace: "pre-wrap", ...style }} dangerouslySetInnerHTML={{ __html: richToHtml(value) }} />;
}

// `compact`: la barra compare solo quando il campo è attivo (righe del capitolato).
export default function RichTextEditor({ value, onChange, T, style, focusStyle, compact = false, minRows = 2, placeholder = "", autoFocus = false }) {
  useCss();
  const ref = useRef(null);
  const ultimo = useRef(null); // ultimo valore emesso: se value coincide non si tocca il DOM (il cursore resta dov'è)
  const [focus, setFocus] = useState(false);
  const [stato, setStato] = useState({ b: false, i: false });

  useLayoutEffect(() => {
    const v = value || "";
    if (v === ultimo.current || !ref.current) return;
    ref.current.innerHTML = richToHtml(v, { editor: true });
    ultimo.current = v;
  }, [value]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, []); // eslint-disable-line

  // stato dei pulsanti B / I in base alla selezione
  useEffect(() => {
    if (!focus) return;
    const h = () => {
      try { setStato({ b: document.queryCommandState("bold"), i: document.queryCommandState("italic") }); } catch { /* browser senza queryCommandState */ }
    };
    document.addEventListener("selectionchange", h); h();
    return () => document.removeEventListener("selectionchange", h);
  }, [focus]);

  const emetti = () => {
    const v = normalizeRich(ref.current.innerHTML, { html: true });
    if (v === ultimo.current) return;
    ultimo.current = v; onChange(v);
  };
  const cmd = (name, arg) => {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, false); } catch { /* ignora */ }
    document.execCommand(name, false, arg);
    emetti();
  };
  const onKeyDown = (e) => {
    // Invio = a capo semplice (<br>), niente <div> annidati
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!document.execCommand("insertLineBreak")) document.execCommand("insertHTML", false, "<br>");
      emetti();
    }
  };
  // incolla solo testo: niente stili/caratteri da Word o dal web
  const onPaste = (e) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text/plain");
    if (t) document.execCommand("insertText", false, t.replace(/\r\n?/g, "\n"));
  };

  const fs = Number.parseFloat(style?.fontSize) || 12.5;
  const lh = style?.lineHeight || 1.4;
  const mostraBarra = !compact || focus;
  const btn = (attivo) => ({
    width: 26, height: 24, padding: 0, border: "none", borderRadius: 6, cursor: "pointer",
    background: attivo ? T.navy : "transparent", color: attivo ? T.bg : T.ink, fontSize: 12.5, lineHeight: 1,
    fontFamily: "var(--font-ui)", display: "inline-flex", alignItems: "center", justifyContent: "center",
  });
  const giu = (fn) => ({ onMouseDown: (e) => { e.preventDefault(); fn(); } }); // mousedown: il campo non perde selezione

  const barra = mostraBarra && (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: 2, background: T.surface2 || T.bg, border: `0.5px solid ${T.border}`, borderRadius: 8, ...(compact ? { marginTop: 4 } : { marginBottom: 6 }) }}>
      <button type="button" title="Grassetto (⌘B)" {...giu(() => cmd("bold"))} style={{ ...btn(stato.b && focus), fontWeight: 700 }}>B</button>
      <button type="button" title="Corsivo (⌘I)" {...giu(() => cmd("italic"))} style={{ ...btn(stato.i && focus), fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</button>
      <span style={{ width: 0.5, alignSelf: "stretch", background: T.border, margin: "3px 4px" }} />
      <button type="button" title="Colore automatico" {...giu(() => cmd("foreColor", RICH_AUTO))} style={{ ...btn(false), width: 22 }}>
        <span style={{ width: 13, height: 13, borderRadius: "50%", border: `1.5px solid ${T.ink}`, boxSizing: "border-box", background: `linear-gradient(135deg, transparent 45%, ${T.ink} 45%, ${T.ink} 55%, transparent 55%)` }} />
      </button>
      {RICH_COLORI.map((c) => (
        <button key={c.hex} type="button" title={c.nome} {...giu(() => cmd("foreColor", c.hex))} style={{ ...btn(false), width: 22 }}>
          <span style={{ width: 13, height: 13, borderRadius: "50%", background: c.hex }} />
        </button>
      ))}
    </div>
  );

  return (
    <div onFocus={() => setFocus(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false); }}>
      {!compact && barra}
      <div ref={ref} className="rt-edit" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
        data-placeholder={placeholder} onInput={emetti} onKeyDown={onKeyDown} onPaste={onPaste}
        style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", cursor: "text", lineHeight: lh, minHeight: `calc(${minRows} * ${lh}em + ${compact ? 6 : 14}px)`, fontSize: fs, ...style, ...(focus ? focusStyle : null) }} />
      {compact && barra}
    </div>
  );
}
