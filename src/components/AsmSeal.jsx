// ─────────────────────────────────────────────
// AsmSeal.jsx — Logo / Seal component per ASM
// Font richiesti nel tuo index.html o CSS globale:
// @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&family=IBM+Plex+Mono:wght@500&display=swap');
// ─────────────────────────────────────────────

import React from 'react';

/**
 * Props:
 *  size      — 'sm' | 'md' | 'lg' | 'hero'
 *              sm   → wordmark 36px  (navbar / favicon-area)
 *              md   → wordmark 64px  (footer, card)
 *              lg   → wordmark 96px  (default, uso generale)
 *              hero → wordmark 108px (hero section)
 *  theme     — 'light' | 'dark'
 *              light → INK su PAPER (sfondo carta)
 *              dark  → PAPER/BRASS su NAVY (sfondo scuro)
 *  showBorder — bool, default true — mostra il rettangolo seal
 *  showBottom — bool, default true — mostra la riga "01 — design …"
 *  className  — classi extra Tailwind/CSS
 */

const SIZES = {
  sm:   { word: 36,  top: 8,   bot: 7,   pad: '10px 16px', gap: 6,  bar: 22, sq: 5,  ul: 3, ulo: -4 },
  md:   { word: 64,  top: 9,   bot: 8,   pad: '18px 26px', gap: 10, bar: 28, sq: 6,  ul: 4, ulo: -5 },
  lg:   { word: 96,  top: 10,  bot: 9,   pad: '24px 36px', gap: 12, bar: 32, sq: 7,  ul: 5, ulo: -6 },
  hero: { word: 108, top: 10.5,bot: 9.5, pad: '30px 42px', gap: 14, bar: 34, sq: 7,  ul: 6, ulo: -6 },
};

const THEMES = {
  light: {
    ink:    '#0E0E0D',
    navy:   '#13315C',
    muted:  '#8a847b',
    accent: '#13315C',   // colore underline S
    bg:     'transparent',
  },
  dark: {
    ink:    '#EEF1F6',
    navy:   '#D9C98A',   // brass come accento su scuro
    muted:  '#a09b96',
    accent: '#D9C98A',
    bg:     'transparent',
  },
};

export default function AsmSeal({
  size = 'lg',
  theme = 'light',
  showBorder = true,
  showBottom = true,
  className = '',
  style = {},
}) {
  const s = SIZES[size] || SIZES.lg;
  const t = THEMES[theme] || THEMES.light;

  const wrapStyle = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: s.gap,
    padding: s.pad,
    position: 'relative',
    fontFamily: "'Space Grotesk', sans-serif",
    background: t.bg,
    ...(showBorder ? { border: `1px solid ${t.ink}` } : {}),
    ...style,
  };

  // corner accents (pseudo-elements non disponibili inline → usiamo div assoluti)
  const cornerBase = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderTop: `1px solid ${t.navy}`,
    borderLeft: `1px solid ${t.navy}`,
  };

  return (
    <div className={className} style={wrapStyle}>

      {/* Angoli decorativi */}
      {showBorder && (
        <>
          <span style={{ ...cornerBase, left: -1, top: -1 }} />
          <span style={{ ...cornerBase, right: -1, bottom: -1, transform: 'rotate(180deg)' }} />
        </>
      )}

      {/* Riga superiore: — ARCHITECT STUDIO MANAGEMENT ■ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 500,
        fontSize: s.top,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: t.ink,
      }}>
        <span style={{ width: s.bar, height: 1, background: t.ink, display: 'inline-block' }} />
        <span>Architect Studio Management</span>
        <span style={{ width: s.sq, height: s.sq, background: t.navy, display: 'inline-block' }} />
      </div>

      {/* Wordmark ASM con S sottolineata */}
      <div style={{
        fontWeight: 600,
        fontSize: s.word,
        letterSpacing: '-0.05em',
        lineHeight: 0.9,
        color: t.ink,
        userSelect: 'none',
      }}>
        <span>A</span>
        <span style={{
          textDecoration: 'underline',
          textDecorationColor: t.accent,
          textDecorationThickness: s.ul,
          textUnderlineOffset: s.ulo,
        }}>S</span>
        <span>M</span>
      </div>

      {/* Riga inferiore: 01 — design  02 — build  03 — manage */}
      {showBottom && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          paddingTop: 6,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 500,
          fontSize: s.bot,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: t.muted,
        }}>
          <span>01 — design</span>
          <span>02 — build</span>
          <span>03 — manage</span>
        </div>
      )}

    </div>
  );
}
