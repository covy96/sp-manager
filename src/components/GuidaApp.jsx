import { useEffect, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// Palette accenti (coerente con i mock della landing)
const BLUE = "#1d4ed8", PURPLE = "#7c3aed", AMBER = "#b45309";

// ══════════════════════════════════════════════════════════════════
//  Mock UI realistici (div, come nella landing) — theme-aware
// ══════════════════════════════════════════════════════════════════
function Card({ T, children, style = {} }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, boxShadow: T.shadow, ...style }}>
      {children}
    </div>
  );
}

function Stat({ T, label, value, color, bg }) {
  return (
    <div style={{ background: bg || T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "7px 11px", boxShadow: T.shadow }}>
      <div style={{ ...mono, fontSize: 7.5, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || T.ink, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function lbl(T) { return { ...mono, fontSize: 7.5, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }; }
function track(T) { return { height: 5, background: `${T.muted}26`, borderRadius: 3 }; }

function Mock({ type, T }) {
  const green = T.green, navy = T.navy, red = T.red;

  switch (type) {
    case "welcome":
      return (
        <Card T={T} style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderBottom: `0.5px solid ${T.border}` }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
            <span style={{ ...mono, fontSize: 8, color: T.muted, marginLeft: 6 }}>SP Manager</span>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ width: 74, flexShrink: 0, borderRight: `0.5px solid ${T.border}`, padding: "9px 8px", display: "flex", flexDirection: "column", gap: 7 }}>
              {[1, 0, 0, 0, 0].map((on, k) => <div key={k} style={{ height: 6, borderRadius: 3, background: on ? navy : `${T.muted}40`, width: on ? "100%" : `${80 - k * 8}%` }} />)}
            </div>
            <div style={{ flex: 1, padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                <Stat T={T} label="Progetti" value="8" color={navy} />
                <Stat T={T} label="Commesse" value="6" color={green} />
                <Stat T={T} label="Ore" value="32h" color={T.ink} />
              </div>
              {[100, 80, 65].map((w, k) => <div key={k} style={{ height: 6, borderRadius: 3, background: `${T.muted}33`, width: `${w}%`, marginBottom: 6 }} />)}
            </div>
          </div>
        </Card>
      );

    case "flow": {
      const steps = [
        { tag: "OFFERTA", col: T.muted, val: "€52.000", sub: "Bozza" },
        { tag: "COMMESSA", col: navy, val: "€52.000", sub: "Attiva" },
        { tag: "FATTURA", col: green, val: "€15.600", sub: "Pagata" },
      ];
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {steps.map((s, k) => (
            <div key={k} style={{ display: "contents" }}>
              <Card T={T} style={{ flex: 1, padding: "9px 8px" }}>
                <div style={{ ...mono, fontSize: 7, letterSpacing: "0.1em", color: s.col, fontWeight: 700, marginBottom: 6 }}>{s.tag}</div>
                <div style={{ height: 5, width: "70%", borderRadius: 3, background: `${T.muted}33`, marginBottom: 4 }} />
                <div style={{ height: 5, width: "50%", borderRadius: 3, background: `${T.muted}33`, marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: s.col }}>{s.val}</div>
                <div style={{ ...mono, fontSize: 7.5, color: T.muted }}>{s.sub}</div>
              </Card>
              {k < 2 && <span style={{ color: navy, fontSize: 14, flexShrink: 0 }}>→</span>}
            </div>
          ))}
        </div>
      );
    }

    case "contacts": {
      const rows = [
        { i: "MR", n: "Studio Rossi S.r.l.", e: "info@studiorossi.it", c: navy },
        { i: "GV", n: "Giulia Verdi", e: "g.verdi@mail.it", c: green },
        { i: "AC", n: "Condominio Aurora", e: "aurora@pec.it", c: PURPLE },
      ];
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={lbl(T)}>Anagrafica clienti</div>
          {rows.map((r, k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", borderBottom: k < rows.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: r.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{r.i}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.ink }}>{r.n}</div>
                <div style={{ ...mono, fontSize: 8, color: T.muted }}>{r.e}</div>
              </div>
              <div style={{ ...mono, fontSize: 8, color: T.muted, background: T.surface2, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "2px 8px", flexShrink: 0 }}>{2 + k} lavori</div>
            </div>
          ))}
        </Card>
      );
    }

    case "services":
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>🧩 Progettazione architettonica</div>
            <div style={{ ...mono, fontSize: 8, color: T.muted }}>4 task</div>
          </div>
          {["Rilievo e analisi stato di fatto", "Progetto preliminare", "Progetto definitivo", "Progetto esecutivo"].map((t, k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", borderBottom: k < 3 ? `0.5px solid ${T.border}` : "none" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#fff" }}>✓</span>
              <div style={{ fontSize: 10, color: T.ink }}>{t}</div>
            </div>
          ))}
        </Card>
      );

    case "lineitems": {
      const items = [["Progettazione architettonica", "€8.000", true], ["Pratica edilizia (CILA)", "€1.500", true], ["Direzione lavori", "€6.000", true], ["Relazione tecnica", "€800", false]];
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={lbl(T)}>Voci offerta — listino</div>
          {items.map(([n, v, on], k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: k < items.length - 1 ? `0.5px solid ${T.border}` : "none", opacity: on ? 1 : 0.5 }}>
              <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: T.ink }}>{n}</div>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: navy }}>{v}</div>
              <div style={{ width: 26, height: 14, borderRadius: 7, background: on ? green : `${T.muted}55`, position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 10, height: 10, borderRadius: "50%", background: "#fff", transition: "all 0.2s" }} />
              </div>
            </div>
          ))}
        </Card>
      );
    }

    case "offer":
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>Offerta 2026/014</div>
            <div style={{ ...mono, fontSize: 8, color: T.muted }}>Villa Lario</div>
          </div>
          {[["Progettazione architettonica", "€8.000"], ["Pratica edilizia", "€1.500"], ["Direzione lavori", "€6.000"]].map(([n, v], k) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `0.5px solid ${T.border}` }}>
              <div style={{ fontSize: 9.5, color: T.ink }}>{n}</div>
              <div style={{ ...mono, fontSize: 9.5, color: T.muted }}>{v}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, background: `${navy}14`, borderRadius: T.radiusSm, padding: "7px 10px" }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: navy, fontWeight: 700 }}>TOTALE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: navy }}>€15.500</div>
          </div>
        </Card>
      );

    case "commesse":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <Stat T={T} label="Contratto" value="€52.000" color={T.ink} />
            <Stat T={T} label="Incassato" value="€21.000" color={green} />
            <Stat T={T} label="Residuo" value="€31.000" color={AMBER} />
          </div>
          <Card T={T} style={{ padding: "10px 12px" }}>
            <div style={lbl(T)}>Rate — Torre Uffici Centro</div>
            {[["Acconto", "30%", "€15.600", "✓ Pagato", green], ["SAL 1", "40%", "€20.800", "In attesa", T.muted], ["Saldo", "30%", "€15.600", "In attesa", T.muted]].map(([r, p, v, s, sc]) => (
              <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.ink, flex: 1 }}>{r}</div>
                <div style={{ ...mono, fontSize: 8, color: T.muted, width: 34 }}>{p}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: navy, width: 56, textAlign: "right" }}>{v}</div>
                <div style={{ ...mono, fontSize: 8.5, color: sc, width: 60, textAlign: "right", fontWeight: sc === green ? 600 : 400 }}>{s}</div>
              </div>
            ))}
          </Card>
        </div>
      );

    case "invoice":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <Stat T={T} label="Emesse" value="€73.400" color={T.ink} />
            <Stat T={T} label="Pagate" value="€42.200" color={green} />
            <Stat T={T} label="In attesa" value="€31.200" color={AMBER} />
          </div>
          <Card T={T} style={{ padding: "10px 12px" }}>
            {[["FT 2026/001", "Blocco A — Milano", "€15.600", "PAGATA", green], ["FT 2026/002", "Villa Lario", "€20.800", "PAGATA", green], ["FT 2026/003", "Showroom Navigli", "€11.800", "IN ATTESA", T.muted]].map(([n, p, v, s, sc]) => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <div><div style={{ fontSize: 10, fontWeight: 600, color: T.ink }}>{n}</div><div style={{ ...mono, fontSize: 8, color: T.muted }}>{p}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ ...mono, fontSize: 10, fontWeight: 700, color: navy }}>{v}</div><div style={{ ...mono, fontSize: 8, color: sc, fontWeight: sc === green ? 600 : 400 }}>{s}</div></div>
              </div>
            ))}
          </Card>
        </div>
      );

    case "scrivania": {
      const tasks = [["Consegna tavole esecutive", "Blocco A — Milano", "Oggi", red], ["Verifica strutturale", "Villa Lario", "Domani", navy], ["Invio preventivo", "Showroom Navigli", "Ven 20", T.muted]];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <Stat T={T} label="Progetti" value="8" color={navy} />
            <Stat T={T} label="Task oggi" value="5" color={red} />
            <Stat T={T} label="Ore sett." value="32h" color={green} />
          </div>
          <Card T={T} style={{ padding: "10px 12px" }}>
            <div style={lbl(T)}>Prossime scadenze</div>
            {tasks.map((r, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: k < tasks.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
                <div><div style={{ fontSize: 10, fontWeight: 600, color: T.ink }}>{r[0]}</div><div style={{ ...mono, fontSize: 8, color: T.muted }}>{r[1]}</div></div>
                <div style={{ ...mono, fontSize: 8.5, color: r[3], flexShrink: 0, marginLeft: 8, fontWeight: r[3] !== T.muted ? 600 : 400 }}>{r[2]}</div>
              </div>
            ))}
          </Card>
        </div>
      );
    }

    case "timesheet": {
      const rows = [{ i: "AR", days: [8, 8, 0, 7, 8], c: navy }, { i: "MB", days: [6, 8, 8, 0, 7], c: green }, { i: "LC", days: [0, 5, 8, 8, 6], c: PURPLE }];
      const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={lbl(T)}>Settimana 22 — Blocco A Milano</div>
          <div style={{ display: "flex", marginBottom: 5 }}>
            <div style={{ width: 30, flexShrink: 0 }} />
            {days.map((d) => <div key={d} style={{ flex: 1, textAlign: "center", ...mono, fontSize: 7.5, color: T.muted }}>{d}</div>)}
            <div style={{ width: 26, ...mono, fontSize: 7.5, color: T.muted, textAlign: "right" }}>Tot</div>
          </div>
          {rows.map((r) => (
            <div key={r.i} style={{ display: "flex", alignItems: "center", marginBottom: 5, paddingBottom: 5, borderBottom: `0.5px solid ${T.border}` }}>
              <div style={{ width: 30, flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: r.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, fontWeight: 700, color: "#fff" }}>{r.i}</div>
              </div>
              {r.days.map((h, k) => (
                <div key={k} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  {h > 0
                    ? <span style={{ display: "inline-flex", width: 22, height: 18, background: `${r.c}26`, borderRadius: 4, ...mono, fontSize: 8, color: r.c, fontWeight: 700, alignItems: "center", justifyContent: "center" }}>{h}h</span>
                    : <span style={{ ...mono, fontSize: 9, color: `${T.muted}66` }}>—</span>}
                </div>
              ))}
              <div style={{ width: 26, textAlign: "right", ...mono, fontSize: 9, fontWeight: 700, color: navy }}>{r.days.reduce((s, v) => s + v, 0)}h</div>
            </div>
          ))}
        </Card>
      );
    }

    case "pratiche": {
      const rows = [["CILA", "Villa Lario", "Approvata", green], ["SCIA", "Showroom Navigli", "In istruttoria", BLUE], ["Permesso di Costruire", "Blocco A — Milano", "Scad. 30 Giu", AMBER]];
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={lbl(T)}>Pratiche edilizie</div>
          {rows.map((r, k) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: k < rows.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: T.ink }}>{r[0]}</div><div style={{ ...mono, fontSize: 8, color: T.muted }}>{r[1]}</div></div>
              <div style={{ ...mono, fontSize: 8, color: r[3], background: `${r[3]}1f`, border: `0.5px solid ${r[3]}44`, borderRadius: 10, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>{r[2]}</div>
            </div>
          ))}
        </Card>
      );
    }

    case "sitereport":
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>📐 Report cantiere #3</div>
            <div style={{ ...mono, fontSize: 8, color: T.muted }}>14 Giu 2026</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
            {[[navy, green], [PURPLE, BLUE], [AMBER, navy]].map((g, k) => (
              <div key={k} style={{ height: 40, borderRadius: T.radiusSm, background: `linear-gradient(135deg, ${g[0]}cc, ${g[1]}99)`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "rgba(255,255,255,0.18)" }} />
              </div>
            ))}
          </div>
          {[100, 75].map((w, k) => <div key={k} style={{ height: 5, borderRadius: 3, background: `${T.muted}33`, width: `${w}%`, marginBottom: 5 }} />)}
        </Card>
      );

    case "gantt": {
      const bars = [{ l: "Concept design", w: 22, x: 0, c: navy }, { l: "Prog. definitivo", w: 34, x: 12, c: BLUE }, { l: "Autorizzazioni", w: 18, x: 36, c: PURPLE }, { l: "Direzione lavori", w: 30, x: 52, c: AMBER }];
      const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      return (
        <Card T={T} style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", marginBottom: 8, paddingBottom: 6, borderBottom: `0.5px solid ${T.border}` }}>
            <div style={{ width: 92, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
              {months.map((m) => <span key={m} style={{ ...mono, fontSize: 6.5, color: T.muted }}>{m}</span>)}
            </div>
          </div>
          {bars.map((b) => (
            <div key={b.l} style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
              <div style={{ width: 92, flexShrink: 0, fontSize: 8, fontWeight: 500, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{b.l}</div>
              <div style={{ flex: 1, height: 16, position: "relative" }}>
                <div style={{ position: "absolute", left: `${b.x}%`, width: `${b.w}%`, height: "100%", background: b.c, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", overflow: "hidden" }}>{b.l}</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      );
    }

    case "team": {
      const m = [["GC", "Giacomo C.", "Titolare", navy], ["AR", "Anna R.", "Project Mgr", green], ["LB", "Luca B.", "Architetto", PURPLE], ["SP", "Sara P.", "Collaboratore", AMBER]];
      return (
        <Card T={T} style={{ padding: "12px" }}>
          <div style={lbl(T)}>Team studio · 4 membri</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {m.map((x) => (
              <div key={x[0]} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: x[3], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>{x[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{x[1]}</div>
                  <div style={{ ...mono, fontSize: 7.5, color: T.muted }}>{x[2]}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case "analytics": {
      const items = [["Blocco A — Milano", 52000, 21000], ["Villa Lario", 38000, 38000], ["Showroom Navigli", 29500, 12000], ["Residenza Privata", 44000, 0]];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <Stat T={T} label="Contratti" value="€163k" color={T.ink} />
            <Stat T={T} label="Incassato" value="€71k" color={green} />
            <Stat T={T} label="Da incass." value="€92k" color={AMBER} />
          </div>
          <Card T={T} style={{ padding: "10px 12px" }}>
            {items.map(([n, v, inc], k) => {
              const pct = Math.round((inc / v) * 100), done = pct === 100;
              return (
                <div key={k} style={{ marginBottom: k < items.length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: T.ink }}>{n}</div>
                    <div style={{ ...mono, fontSize: 8, color: done ? green : AMBER }}>{done ? "✓ Saldato" : `res. €${((v - inc) / 1000).toFixed(0)}k`}</div>
                  </div>
                  <div style={track(T)}><div style={{ height: 5, width: `${pct}%`, background: done ? green : navy, borderRadius: 3 }} /></div>
                </div>
              );
            })}
          </Card>
        </div>
      );
    }

    case "tips":
      return (
        <Card T={T} style={{ padding: "12px" }}>
          <div style={lbl(T)}>Per iniziare</div>
          {[["Completa il Profilo Studio", true], ["Configura Servizi e Voci offerta", true], ["Invita il tuo team", false], ["Crea la prima offerta", false]].map(([t, done], k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: k < 3 ? `0.5px solid ${T.border}` : "none" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${done ? green : T.muted}`, background: done ? green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#fff" }}>{done ? "✓" : ""}</span>
              <div style={{ fontSize: 10.5, color: T.ink, fontWeight: done ? 400 : 600, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{t}</div>
            </div>
          ))}
        </Card>
      );

    default:
      return <Card T={T} style={{ height: 110 }} />;
  }
}

// ══════════════════════════════════════════════════════════════════
//  Slide della guida
// ══════════════════════════════════════════════════════════════════
// nav  = voce di sidebar da evidenziare (spotlight) se presente a schermo
// goto = pagina aperta dal pulsante "Vai →" (anche pagine non in sidebar)
const SLIDES = [
  { mock: "welcome", goto: "/dashboard", emoji: "👋", titolo: "Benvenuto in SP Manager", testo: "Il gestionale per studi di architettura e professionisti tecnici: progetti, offerte, commesse, pagamenti, pratiche e team — tutto in un posto solo.", punti: ["Sfoglia con le frecce ← → o i pulsanti", "Riapri questa guida quando vuoi dalla pagina Info"] },
  { mock: "flow", nav: "/offerte", goto: "/offerte", emoji: "🔄", titolo: "Il flusso di lavoro", testo: "Il cuore dell'app è il percorso che porta un lavoro dall'idea all'incasso:", punti: ["Offerta → Commessa → Proforma / Fattura", "Ogni passaggio eredita i dati dal precedente, senza riscrivere nulla"] },
  { mock: "contacts", goto: "/clienti", emoji: "👤", titolo: "Anagrafica & Clienti", testo: "La rubrica unica dello studio. Salvi una volta i dati di clienti e committenti e li richiami ovunque.", punti: ["Riusa i contatti in offerte, commesse e progetti", "Ogni cliente mostra i lavori collegati"] },
  { mock: "services", nav: "/impostazioni/servizi", inSettings: true, goto: "/impostazioni/servizi", emoji: "🧩", titolo: "Gestione Servizi", testo: "Definisci i tuoi servizi e le task predefinite per ciascuno. Quando avvii un lavoro, le attività si creano da sole.", punti: ["Imposta una volta i servizi tipici dello studio", "Riduci il lavoro manuale ad ogni nuovo progetto"] },
  { mock: "lineitems", nav: "/impostazioni/voci-offerta", inSettings: true, goto: "/impostazioni/voci-offerta", emoji: "📑", titolo: "Voci Offerta", testo: "Le voci predefinite con prezzo da inserire nelle offerte con un clic. Le attivi, disattivi e personalizzi per ogni offerta.", punti: ["Listino sempre pronto, niente importi a memoria", "Modifica il prezzo caso per caso quando serve"] },
  { mock: "offer", nav: "/offerte", goto: "/offerte", emoji: "📋", titolo: "Offerte", testo: "Componi il preventivo scegliendo le voci e applicando sconti. Quando il cliente accetta, diventa una commessa.", punti: ["Totale calcolato in automatico", "Accettazione → commessa, in un clic"] },
  { mock: "commesse", nav: "/commesse", goto: "/commesse", emoji: "💼", titolo: "Commesse & pagamenti", testo: "Ogni commessa mostra a colpo d'occhio la situazione economica.", punti: ["Importo totale, incassato e residuo sempre aggiornati", "Rate, costi extra e costi interni per il margine reale"] },
  { mock: "invoice", nav: "/fatture", goto: "/fatture", plan: "Studio", emoji: "🧾", titolo: "Proforma & Fatture", testo: "Genera proforma e fatture collegate alle commesse, senza perdere il filo dei pagamenti.", punti: ["Il flusso si adatta al tipo di cliente (privato o società)", "Scadenze e stato pagamento sotto controllo"] },
  { mock: "scrivania", nav: "/scrivania", goto: "/scrivania", emoji: "📁", titolo: "Progetti & Scrivania", testo: "Organizza il lavoro per progetto e segui le attività.", punti: ["Progetti: contenitore di ogni lavoro con dati e stato", "Scrivania: il tuo centro personale con le task assegnate a te"] },
  { mock: "timesheet", nav: "/timesheet", goto: "/timesheet", emoji: "⏱", titolo: "Timesheet", testo: "Registra le ore lavorate su ciascun progetto: è la base per redditività e carico di lavoro.", punti: ["Inserimento giorno per giorno, con note", "Le ore alimentano report e analisi automaticamente"] },
  { mock: "pratiche", goto: "/progetti", emoji: "🏛", titolo: "Pratiche edilizie", testo: "Tieni traccia delle pratiche di ogni progetto: tipo, stato e scadenze.", punti: ["Le scadenze compaiono nello Scadenzario in Dashboard", "Non perdi più una data importante"] },
  { mock: "sitereport", nav: "/impostazioni/report", inSettings: true, goto: "/impostazioni/report", emoji: "📐", titolo: "Report di cantiere", testo: "Documenta i sopralluoghi con note e foto, ed esportali in PDF professionale.", punti: ["Allega foto e annotazioni al progetto", "Personalizza intestazione e logo da Impostazioni → Report"] },
  { mock: "gantt", nav: "/gantt-progetti", goto: "/gantt-progetti", plan: "Studio", emoji: "📅", titolo: "Calendario & Gantt", testo: "Pianifica scadenze e lavorazioni nel tempo.", punti: ["Calendario: eventi, scadenze e appuntamenti", "Gantt: le fasi dei progetti su una timeline visiva"] },
  { mock: "team", nav: "/team", goto: "/team", plan: "Studio", emoji: "👥", titolo: "Team & permessi", testo: "Invita i collaboratori e assegna a ciascuno il ruolo giusto.", punti: ["Condividi il codice invito (in Profilo Studio)", "Ruoli da Titolare a Collaboratore, con permessi su misura"] },
  { mock: "analytics", nav: "/analisi-hub", goto: "/analisi-hub", plan: "Pro", emoji: "📊", titolo: "Analisi & Report", testo: "Trasforma i dati in decisioni con viste aggregate su economia e produttività.", punti: ["Analisi: KPI, incassi, margini, andamento offerte", "Report: ore per progetto e per membro, esportabili"] },
  { mock: "tips", emoji: "🚀", titolo: "Sfruttala al massimo", testo: "Qualche consiglio per partire con il piede giusto:", punti: ["Completa Profilo Studio, Servizi e Voci offerta", "Esporta i dati quando vuoi · Aiuto: info@asmstudio.it"] },
];

export default function GuidaApp({ open, onClose }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null); // bounding box della voce di sidebar evidenziata

  const isFirst = i === 0;
  const isLast = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const next = () => setI((v) => Math.min(SLIDES.length - 1, v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));
  const goTo = (path) => { onClose?.(); if (path) navigate(path); };

  useEffect(() => { if (open) setI(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Misura la voce da evidenziare (sidebar o menu Impostazioni). Solo desktop.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      if (isMobile || !s.nav) { setRect(null); return; }
      const el = document.querySelector(`[data-tour="${s.nav}"]`);
      if (el && el.offsetParent !== null) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };

    // Se la slide è di Impostazioni, apri il menu (altrimenti chiudilo)
    if (!isMobile && s.inSettings) window.dispatchEvent(new CustomEvent("asm-guide-settings-open"));
    else window.dispatchEvent(new CustomEvent("asm-guide-settings-close"));

    // Retry: il dropdown Impostazioni si renderizza dopo l'apertura
    measure();
    const t1 = setTimeout(measure, 90);
    const t2 = setTimeout(measure, 220);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, [open, i, isMobile, s.nav, s.inSettings]);

  // Alla chiusura della guida, richiudi sempre il menu Impostazioni
  useEffect(() => {
    if (!open) window.dispatchEvent(new CustomEvent("asm-guide-settings-close"));
    return () => window.dispatchEvent(new CustomEvent("asm-guide-settings-close"));
  }, [open]);

  if (!open) return null;

  const spotlight = !!rect;

  const planBadge = s.plan && (
    <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: s.plan === "Pro" ? "#d97706" : T.navy, background: s.plan === "Pro" ? "rgba(217,119,6,0.12)" : `${T.navy}18`, border: `0.5px solid ${s.plan === "Pro" ? "rgba(217,119,6,0.3)" : `${T.navy}33`}`, padding: "2px 8px", borderRadius: 3 }}>
      Piano {s.plan}
    </span>
  );

  const btn = (label, onClick, primary, disabled) => (
    <button onClick={onClick} disabled={disabled} style={{ border: primary ? "none" : `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: primary ? T.navy : "transparent", color: primary ? "#EEF1F6" : T.ink, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: primary ? "9px 22px" : "9px 18px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>{label}</button>
  );

  // Corpo condiviso (compact = modalità spotlight, senza mock grande)
  const Body = ({ compact }) => (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? 12 : 16 }}>
        <span style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>
          Guida · {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
      </div>

      {!compact && (
        <div style={{ background: `${T.muted}10`, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 12, marginBottom: 18 }}>
          <Mock type={s.mock} T={T} />
        </div>
      )}

      <div style={{ minHeight: compact ? 0 : (isMobile ? 140 : 124) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: compact ? 18 : 22 }}>{s.emoji}</span>
          <h2 style={{ fontSize: compact ? 16 : 19, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>{s.titolo}</h2>
          {planBadge}
        </div>
        <p style={{ fontSize: compact ? 13 : 14, color: T.muted, lineHeight: 1.6, margin: "0 0 12px" }}>{s.testo}</p>
        {s.punti && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {s.punti.map((p, idx) => (
              <li key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: compact ? 12.5 : 13, color: T.ink, lineHeight: 1.5 }}>
                <span style={{ color: T.navy, fontWeight: 700, flexShrink: 0 }}>→</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pulsante "Vai alla sezione" */}
      {s.goto && (
        <button onClick={() => goTo(s.goto)} style={{ marginTop: 14, width: "100%", border: `1px solid ${T.navy}55`, borderRadius: T.radiusSm, background: `${T.navy}10`, color: T.navy, ...mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 0", cursor: "pointer", fontWeight: 600 }}>
          Vai a questa sezione →
        </button>
      )}

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, margin: "18px 0 14px" }}>
        {SLIDES.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
            style={{ width: idx === i ? 18 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", background: idx === i ? T.navy : T.borderMd, transition: "all 0.2s" }} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
        {btn("← Indietro", prev, false, isFirst)}
        {isLast ? btn("Fine ✓", onClose, true) : btn("Avanti →", next, true)}
      </div>
    </>
  );

  // ── Modalità SPOTLIGHT: evidenzia la voce di sidebar reale ──────
  if (spotlight) {
    const PAD = 6;
    const ttWidth = 340;
    // Se la voce è nella metà destra (es. menu Impostazioni), metti il tooltip a sinistra
    const onRight = rect.left > window.innerWidth / 2;
    const ttLeft = onRight
      ? Math.max(16, rect.left - ttWidth - 18)
      : Math.max(16, Math.min(rect.left + rect.width + 18, window.innerWidth - ttWidth - 16));
    const ttTop = Math.max(16, Math.min(rect.top - 8, window.innerHeight - 380));
    return (
      <>
        {/* click-catcher trasparente */}
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80 }} />
        {/* anello + dimming via box-shadow */}
        <div style={{ position: "fixed", top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 12, border: `2px solid ${T.brass || "#D9C98A"}`, boxShadow: "0 0 0 9999px rgba(14,14,13,0.62)", zIndex: 81, pointerEvents: "none", transition: "all 0.25s ease" }} />
        {/* tooltip */}
        <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: ttTop, left: ttLeft, width: ttWidth, maxHeight: "88vh", overflowY: "auto", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radius, boxShadow: T.shadowLg, padding: "20px 22px", zIndex: 82, display: "flex", flexDirection: "column" }}>
          <Body compact />
        </div>
      </>
    );
  }

  // ── Modalità CENTRATA: card con mockup ──────────────────────────
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,14,13,0.6)", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radius, boxShadow: T.shadowLg, padding: isMobile ? "20px 18px" : "26px 30px", display: "flex", flexDirection: "column" }}>
        <Body compact={false} />
      </div>
    </div>
  );
}
