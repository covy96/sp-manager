import React, { useState } from 'react';
import AsmSeal from '../components/AsmSeal';

const NAV_LINKS = [
  { label: 'Funzionalità', href: '#features' },
  { label: 'Pricing',      href: '#pricing'  },
  { label: 'FAQ',          href: '#faq'       },
];

const FEATURES = [
  {
    num:   '01 — Progetti',
    title: 'Commesse e fasi',
    desc:  'Struttura ogni progetto in fasi, assegna responsabili e monitora lo stato in tempo reale.',
  },
  {
    num:   '02 — Timesheet',
    title: 'Ore e budget',
    desc:  'Registra le ore per progetto e membro del team. Visualizza subito scostamenti rispetto al preventivo.',
  },
  {
    num:   '03 — Tesoreria',
    title: 'Flusso di cassa',
    desc:  'Proforma, fatture e saldi sempre sotto controllo. Nessuna scadenza dimenticata.',
  },
];

const STATS = [
  { num: '59',   label: 'Progetti attivi'   },
  { num: '500+', label: 'Ore tracciate'     },
  { num: '€54k', label: 'Fatturato gestito' },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/mese',
    desc: 'Per iniziare',
    highlight: false,
    features: [
      '1 utente interno',
      '1 collaboratore esterno',
      '5 progetti',
      '5 commesse',
      'Task e timesheet',
      'Calendario',
    ],
    cta: 'Inizia gratis',
    ctaStyle: 'ghost',
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '€14,99',
    period: '/mese',
    desc: 'Per studi in crescita',
    highlight: true,
    features: [
      'Fino a 10 utenti',
      '25 progetti',
      '25 commesse',
      'Report avanzati',
      'Monitoraggio, proforma e fatture',
      'Gantt',
      'Supporto prioritario',
    ],
    cta: 'Prova Studio',
    ctaStyle: 'primary',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€29,99',
    period: '/mese',
    desc: 'Per studi professionali',
    highlight: false,
    features: [
      'Utenti illimitati',
      'Progetti illimitati',
      'Commesse illimitate',
      'Tutto di Studio',
      'Gantt avanzato',
      'Backup su richiesta',
      'Account manager dedicato',
    ],
    cta: 'Prova Pro',
    ctaStyle: 'ghost',
  },
];

const FAQ_DATA = [
  {
    q: 'ASM è adatto a studi piccoli?',
    a: 'Sì, è pensato per studi da 1 a 20 persone. Scala con te.',
  },
  {
    q: 'Posso importare i miei dati esistenti?',
    a: 'Supportiamo import da Excel e CSV per progetti, clienti e timesheet.',
  },
  {
    q: 'È necessario installare qualcosa?',
    a: 'No, ASM è interamente web-based. Funziona su qualsiasi browser e smartphone.',
  },
  {
    q: 'Posso cambiare piano in qualsiasi momento?',
    a: 'Sì, puoi fare upgrade o downgrade in qualsiasi momento. Il cambio è immediato.',
  },
  {
    q: 'Come funziona la fatturazione per privati vs società?',
    a: 'ASM supporta entrambi i flussi: Proforma → Pagamento → Fattura per privati e studi associati, oppure Fattura diretta → Pagamento per le società.',
  },
];

const S = {
  ink:   '#0E0E0D',
  navy:  '#13315C',
  brass: '#D9C98A',
  paper: '#EEF1F6',
  muted: '#8a847b',

  page: {
    fontFamily: "'Space Grotesk', sans-serif",
    background: '#EEF1F6',
    color: '#0E0E0D',
    minHeight: '100vh',
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 48px', background: '#EEF1F6',
    borderBottom: '0.5px solid #0E0E0D26',
    position: 'sticky', top: 0, zIndex: 100,
  },
  navLinks: { display: 'flex', gap: 32, alignItems: 'center' },
  navLink: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#0E0E0D99', textDecoration: 'none', cursor: 'pointer',
  },
  navCtas: { display: 'flex', gap: 10 },
  btnGhost: {
    border: '0.5px solid #0E0E0D', background: 'transparent', color: '#0E0E0D',
    padding: '8px 20px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
  },
  btnPrimary: {
    border: 'none', background: '#13315C', color: '#EEF1F6',
    padding: '8px 20px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
  },
  btnBrass: {
    border: 'none', background: '#D9C98A', color: '#0E0E0D',
    padding: '12px 32px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
    cursor: 'pointer', fontWeight: 500,
  },
  hero: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    minHeight: 520, borderBottom: '0.5px solid #0E0E0D26',
  },
  heroLeft: {
    padding: '72px 48px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', gap: 32, borderRight: '0.5px solid #0E0E0D26',
  },
  heroEyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.3em', textTransform: 'uppercase', color: '#13315C',
  },
  heroTitle: {
    fontSize: 44, fontWeight: 600, lineHeight: 1.05,
    letterSpacing: '-0.03em', color: '#0E0E0D',
  },
  heroTitleAccent: {
    textDecoration: 'underline', textDecorationColor: '#13315C',
    textDecorationThickness: 3, textUnderlineOffset: 3,
  },
  heroSub: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    lineHeight: 1.8, color: '#0E0E0D80', letterSpacing: '0.02em', maxWidth: 380,
  },
  heroCtas: { display: 'flex', gap: 12 },
  heroRight: {
    padding: 48, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#EEF1F6',
  },
  features: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    borderBottom: '0.5px solid #0E0E0D26',
  },
  feat: (last) => ({
    padding: '40px 36px',
    borderRight: last ? 'none' : '0.5px solid #0E0E0D26',
  }),
  featNum: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.3em', color: '#13315C', marginBottom: 16, textTransform: 'uppercase',
  },
  featTitle: {
    fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
    marginBottom: 12, color: '#0E0E0D',
  },
  featDesc: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    lineHeight: 1.75, color: '#0E0E0D70', letterSpacing: '0.02em',
  },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#13315C',
  },
  stat: (last) => ({
    padding: '48px 36px',
    borderRight: last ? 'none' : '0.5px solid #EEF1F620',
  }),
  statNum: {
    fontSize: 48, fontWeight: 600, letterSpacing: '-0.04em',
    color: '#D9C98A', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif",
  },
  statLabel: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.25em', textTransform: 'uppercase', color: '#EEF1F660',
  },
  faqSection: {
    padding: '72px 48px', borderBottom: '0.5px solid #0E0E0D26', maxWidth: 720,
  },
  faqSectionTitle: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.3em', textTransform: 'uppercase', color: '#13315C', marginBottom: 40,
  },
  faqItem: { borderTop: '0.5px solid #0E0E0D20', padding: '20px 0', cursor: 'pointer' },
  faqQ: {
    fontSize: 16, fontWeight: 600, color: '#0E0E0D',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  faqA: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    lineHeight: 1.75, color: '#0E0E0D80', marginTop: 12, letterSpacing: '0.02em',
  },
  ctaFooter: {
    padding: '80px 48px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', background: '#0E0E0D',
  },
  ctaLabel: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.3em', textTransform: 'uppercase', color: '#EEF1F630', marginBottom: 14,
  },
  ctaTitle: {
    fontSize: 32, fontWeight: 600, color: '#EEF1F6',
    letterSpacing: '-0.02em', lineHeight: 1.2,
  },
  footerBar: {
    padding: '24px 48px', background: '#13315C',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  footerNote: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: '0.15em', color: '#EEF1F640', textTransform: 'uppercase',
  },
};

export default function LandingPage({ onLogin, onRegister }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={S.page}>

      {/* NAV */}
      <nav style={S.nav}>
        <AsmSeal size="sm" showBorder={false} showBottom={false} theme="light" />
        <div style={S.navLinks}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} style={S.navLink}>{l.label}</a>
          ))}
        </div>
        <div style={S.navCtas}>
          <button style={S.btnGhost} onClick={onLogin}>Accedi</button>
          <button style={S.btnPrimary} onClick={onRegister}>Inizia gratis</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={S.hero}>
        <div style={S.heroLeft}>
          <div style={S.heroEyebrow}>01 — gestionale per architetti</div>
          <h1 style={S.heroTitle}>
            Progetti, commesse<br />e team in{' '}
            <span style={S.heroTitleAccent}>un solo posto</span>
          </h1>
          <p style={S.heroSub}>
            Progettato per studi di architettura. Traccia avanzamento, ore, budget
            e scadenze senza perdere tempo in fogli Excel.
          </p>
          <div style={S.heroCtas}>
            <button style={{ ...S.btnPrimary, padding: '12px 28px', fontSize: 12 }} onClick={onRegister}>
              Inizia gratis →
            </button>
            <button style={{ ...S.btnGhost, padding: '12px 28px', fontSize: 12 }}>
              Guarda il demo
            </button>
          </div>
        </div>
        <div style={S.heroRight}>
          <AsmSeal size="hero" theme="light" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={S.features}>
        {FEATURES.map((f, i) => (
          <div key={f.num} style={S.feat(i === FEATURES.length - 1)}>
            <div style={S.featNum}>{f.num}</div>
            <div style={S.featTitle}>{f.title}</div>
            <p style={S.featDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* STATS */}
      <section style={S.stats}>
        {STATS.map((s, i) => (
          <div key={s.label} style={S.stat(i === STATS.length - 1)}>
            <div style={S.statNum}>{s.num}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ borderBottom: '0.5px solid #0E0E0D26' }}>
        {/* Header */}
        <div style={{ padding: '56px 48px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '0.5px solid #0E0E0D26' }}>
          <div style={{ paddingBottom: 32 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#13315C', marginBottom: 14 }}>
              Pricing
            </div>
            <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', color: '#0E0E0D', lineHeight: 1.1 }}>
              Semplice e trasparente.<br />Senza sorprese.
            </div>
          </div>
          <div style={{ paddingBottom: 32, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#0E0E0D60', maxWidth: 280, lineHeight: 1.7 }}>
            Inizia gratis, scala quando cresci. Nessun contratto, nessun vincolo.
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {PLANS.map((plan, i) => (
            <div key={plan.id} style={{
              padding: '40px 36px',
              borderRight: i < PLANS.length - 1 ? '0.5px solid #0E0E0D26' : 'none',
              background: plan.highlight ? '#13315C' : '#fff',
              display: 'flex', flexDirection: 'column', gap: 0,
              position: 'relative',
            }}>
              {/* Badge consigliato */}
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: '#13315C', background: '#D9C98A',
                  padding: '3px 8px',
                }}>
                  Consigliato
                </div>
              )}

              {/* Piano */}
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                letterSpacing: '0.25em', textTransform: 'uppercase',
                color: plan.highlight ? '#D9C98A' : '#8a847b',
                marginBottom: 8,
              }}>{plan.name}</div>

              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                color: plan.highlight ? '#EEF1F660' : '#0E0E0D60', marginBottom: 24,
              }}>{plan.desc}</div>

              {/* Prezzo */}
              <div style={{ marginBottom: 32 }}>
                <span style={{
                  fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em',
                  color: plan.highlight ? '#EEF1F6' : '#0E0E0D',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{plan.price}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  color: plan.highlight ? '#EEF1F660' : '#0E0E0D60', marginLeft: 4,
                }}>{plan.period}</span>
              </div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, flex: 1 }}>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      color: plan.highlight ? '#D9C98A' : '#1a6b3c',
                      fontSize: 12, flexShrink: 0, marginTop: 1,
                    }}>✓</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                      color: plan.highlight ? '#EEF1F6cc' : '#0E0E0D80',
                      lineHeight: 1.5,
                    }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={onRegister}
                style={{
                  border: plan.highlight ? 'none' : plan.ctaStyle === 'ghost' ? '0.5px solid #0E0E0D' : 'none',
                  background: plan.highlight ? '#D9C98A' : plan.ctaStyle === 'ghost' ? 'transparent' : '#13315C',
                  color: plan.highlight ? '#0E0E0D' : plan.ctaStyle === 'ghost' ? '#0E0E0D' : '#EEF1F6',
                  padding: '11px 0', width: '100%',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                  fontWeight: plan.highlight ? 600 : 400,
                }}
              >
                {plan.cta} →
              </button>
            </div>
          ))}
        </div>

        {/* Nota sotto */}
        <div style={{ padding: '20px 48px', borderTop: '0.5px solid #0E0E0D26', background: '#EEF1F6' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#0E0E0D60', letterSpacing: '0.05em' }}>
            Tutti i piani includono accesso web e mobile · Nessuna carta di credito richiesta per il piano Free · Cancellazione in qualsiasi momento
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={S.faqSection}>
        <div style={S.faqSectionTitle}>Domande frequenti</div>
        {FAQ_DATA.map((item, i) => (
          <div key={i} style={S.faqItem} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div style={S.faqQ}>
              <span>{item.q}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#13315C' }}>
                {openFaq === i ? '−' : '+'}
              </span>
            </div>
            {openFaq === i && <div style={S.faqA}>{item.a}</div>}
          </div>
        ))}
      </section>

      {/* CTA FOOTER */}
      <section style={S.ctaFooter}>
        <div>
          <div style={S.ctaLabel}>Pronto a iniziare?</div>
          <div style={S.ctaTitle}>Il tuo studio merita<br />uno strumento su misura.</div>
        </div>
        <button style={S.btnBrass} onClick={onRegister}>Crea il tuo account →</button>
      </section>

      {/* FOOTER BAR */}
      <footer style={S.footerBar}>
        <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark" />
        <span style={S.footerNote}>© 2026 ASM — Architect Studio Management</span>
      </footer>

    </div>
  );
}
