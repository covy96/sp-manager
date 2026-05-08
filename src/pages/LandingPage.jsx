import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; background: #0a0a0a; color: #fff; }

  .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 0.5px solid #ffffff14; position: sticky; top: 0; background: #0a0a0aee; backdrop-filter: blur(12px); z-index: 100; }
  .nav-logo { display: flex; align-items: center; gap: 10px; }
  .nav-logo-icon { width: 32px; height: 32px; background: #0a84ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .nav-logo-icon svg { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .nav-logo-text { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; }
  .nav-links { display: flex; gap: 32px; }
  .nav-links a { font-size: 14px; color: #ffffff80; text-decoration: none; transition: color 0.2s; cursor: pointer; }
  .nav-links a:hover { color: #fff; }
  .nav-cta { display: flex; gap: 10px; }
  .btn-ghost { background: transparent; border: 0.5px solid #ffffff30; color: #fff; padding: 8px 18px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
  .btn-ghost:hover { border-color: #ffffff60; background: #ffffff0a; }
  .btn-primary { background: #0a84ff; border: none; color: #fff; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .btn-primary:hover { background: #0070d8; }

  .hero { text-align: center; padding: 100px 48px 80px; max-width: 860px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: #0a84ff18; border: 0.5px solid #0a84ff40; color: #0a84ff; font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 20px; margin-bottom: 28px; }
  .hero-badge-dot { width: 6px; height: 6px; background: #0a84ff; border-radius: 50%; }
  .hero h1 { font-size: 58px; font-weight: 700; letter-spacing: -1.5px; line-height: 1.1; color: #fff; margin-bottom: 20px; }
  .hero h1 span { color: #0a84ff; }
  .hero p { font-size: 18px; color: #ffffff70; line-height: 1.7; margin-bottom: 36px; max-width: 580px; margin-left: auto; margin-right: auto; }
  .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .btn-hero-primary { background: #0a84ff; border: none; color: #fff; padding: 14px 28px; border-radius: 10px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .btn-hero-primary:hover { background: #0070d8; }
  .btn-hero-ghost { background: transparent; border: 0.5px solid #ffffff30; color: #fff; padding: 14px 28px; border-radius: 10px; font-size: 16px; cursor: pointer; transition: all 0.2s; }
  .btn-hero-ghost:hover { border-color: #ffffff60; }
  .hero-sub { margin-top: 20px; font-size: 13px; color: #ffffff40; }

  .preview { margin: 0 48px 80px; background: #1c1c1e; border: 0.5px solid #ffffff18; border-radius: 16px; overflow: hidden; }
  .preview-bar { background: #2c2c2e; padding: 12px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 0.5px solid #ffffff12; }
  .preview-dot { width: 12px; height: 12px; border-radius: 50%; }
  .preview-screen { display: flex; height: 280px; }
  .preview-sidebar { width: 180px; background: #1c1c1e; border-right: 0.5px solid #ffffff12; padding: 16px 0; flex-shrink: 0; }
  .preview-sidebar-item { padding: 8px 16px; font-size: 13px; display: flex; align-items: center; gap: 10px; cursor: pointer; color: #ffffff60; }
  .preview-sidebar-item.active { background: #3a3a3c; color: #fff; }
  .preview-sidebar-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.5; }
  .preview-sidebar-item.active .preview-sidebar-dot { background: #0a84ff; opacity: 1; }
  .preview-content { flex: 1; padding: 20px; overflow: hidden; }
  .preview-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .preview-stat { background: #2c2c2e; border-radius: 10px; padding: 12px; }
  .preview-stat-label { font-size: 11px; color: #ffffff50; margin-bottom: 4px; }
  .preview-stat-value { font-size: 20px; font-weight: 600; }
  .preview-projects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .preview-card { background: #2c2c2e; border-radius: 10px; padding: 12px; border: 0.5px solid #ffffff12; }
  .preview-card-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .preview-card-sub { font-size: 11px; color: #ffffff50; margin-bottom: 10px; }
  .preview-progress-bar { height: 3px; background: #ffffff15; border-radius: 2px; }
  .preview-progress-fill { height: 100%; background: #0a84ff; border-radius: 2px; }

  .section { padding: 80px 48px; max-width: 1100px; margin: 0 auto; }
  .section-label { font-size: 13px; font-weight: 500; color: #0a84ff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .section-title { font-size: 38px; font-weight: 700; letter-spacing: -0.8px; margin-bottom: 16px; }
  .section-sub { font-size: 16px; color: #ffffff60; line-height: 1.7; max-width: 520px; margin-bottom: 48px; }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .feature-card { background: #1c1c1e; border: 0.5px solid #ffffff14; border-radius: 14px; padding: 28px; }
  .feature-icon { width: 40px; height: 40px; background: #0a84ff18; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .feature-icon svg { width: 20px; height: 20px; stroke: #0a84ff; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .feature-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .feature-desc { font-size: 14px; color: #ffffff60; line-height: 1.6; }

  .pricing-section { padding: 80px 48px; max-width: 1100px; margin: 0 auto; text-align: center; }
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 48px; text-align: left; }
  .pricing-card { background: #1c1c1e; border: 0.5px solid #ffffff14; border-radius: 16px; padding: 32px; position: relative; }
  .pricing-card.featured { border: 2px solid #0a84ff; background: #0a84ff0a; }
  .pricing-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #0a84ff; color: #fff; font-size: 11px; font-weight: 600; padding: 4px 14px; border-radius: 20px; white-space: nowrap; }
  .pricing-plan { font-size: 13px; font-weight: 500; color: #ffffff60; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .pricing-price { font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; }
  .pricing-price span { font-size: 16px; font-weight: 400; color: #ffffff60; }
  .pricing-desc { font-size: 14px; color: #ffffff50; margin-bottom: 24px; }
  .pricing-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .pricing-features li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #ffffffcc; }
  .pricing-features li svg { width: 16px; height: 16px; stroke: #30d158; fill: none; stroke-width: 2.5; stroke-linecap: round; flex-shrink: 0; }
  .pricing-features li.muted { color: #ffffff40; }
  .pricing-features li.muted svg { stroke: #ffffff30; }
  .btn-pricing { width: 100%; padding: 12px; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-pricing-outline { background: transparent; border: 0.5px solid #ffffff30; color: #fff; }
  .btn-pricing-outline:hover { border-color: #ffffff60; background: #ffffff0a; }
  .btn-pricing-filled { background: #0a84ff; border: none; color: #fff; }
  .btn-pricing-filled:hover { background: #0070d8; }

  .stats-section { padding: 60px 48px; border-top: 0.5px solid #ffffff0f; border-bottom: 0.5px solid #ffffff0f; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; max-width: 1100px; margin: 0 auto; text-align: center; }
  .stat-item-value { font-size: 40px; font-weight: 700; color: #0a84ff; letter-spacing: -1px; }
  .stat-item-label { font-size: 14px; color: #ffffff50; margin-top: 4px; }

  .faq-section { padding: 80px 48px; max-width: 720px; margin: 0 auto; }
  .faq-item { border-bottom: 0.5px solid #ffffff14; padding: 20px 0; cursor: pointer; }
  .faq-question { font-size: 16px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
  .faq-answer { font-size: 14px; color: #ffffff60; line-height: 1.7; margin-top: 12px; }
  .faq-toggle { color: #0a84ff; font-size: 20px; font-weight: 300; transition: transform 0.2s; }

  .cta-section { padding: 100px 48px; text-align: center; }
  .cta-section h2 { font-size: 44px; font-weight: 700; letter-spacing: -1px; margin-bottom: 16px; }
  .cta-section p { font-size: 16px; color: #ffffff60; margin-bottom: 36px; }

  .footer { border-top: 0.5px solid #ffffff0f; padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; }
  .footer-text { font-size: 13px; color: #ffffff40; }
  .footer-links { display: flex; gap: 24px; }
  .footer-links a { font-size: 13px; color: #ffffff40; text-decoration: none; cursor: pointer; }
  .footer-links a:hover { color: #fff; }

  @media (max-width: 768px) {
    .nav { padding: 16px 20px; }
    .nav-links { display: none; }
    .hero { padding: 60px 20px 40px; }
    .hero h1 { font-size: 36px; }
    .preview { margin: 0 20px 40px; }
    .preview-sidebar { display: none; }
    .preview-stats { grid-template-columns: repeat(2, 1fr); }
    .preview-projects { grid-template-columns: repeat(2, 1fr); }
    .section { padding: 60px 20px; }
    .features-grid { grid-template-columns: 1fr; }
    .pricing-section { padding: 60px 20px; }
    .pricing-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .faq-section { padding: 60px 20px; }
    .cta-section { padding: 60px 20px; }
    .footer { padding: 24px 20px; flex-direction: column; gap: 16px; text-align: center; }
  }
`;

const CheckIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
);

const faqData = [
  {
    q: "I miei dati sono al sicuro?",
    a: "Sì. I dati sono ospitati su Supabase (infrastruttura europea) e appartengono completamente a te. Puoi esportarli in qualsiasi momento in formato CSV.",
  },
  {
    q: "Posso cancellare quando voglio?",
    a: "Assolutamente. Non ci sono vincoli contrattuali. Cancelli l'abbonamento in un click e mantieni accesso ai tuoi dati per 30 giorni.",
  },
  {
    q: "Come funziona l'agente AI?",
    a: "L'agente AI è integrato nella dashboard e ha accesso ai dati reali del tuo studio. Puoi chiedergli \"chi devo sollecitare?\" o \"quante ore ha lavorato il team questa settimana?\" e risponde con dati precisi.",
  },
  {
    q: "Funziona su mobile?",
    a: "ASM è una web app ottimizzata per desktop, dove gli architetti lavorano principalmente. È accessibile da qualsiasi browser, incluso mobile, ma l'esperienza migliore è su Mac o PC.",
  },
  {
    q: "Posso invitare tutto il mio team?",
    a: "Sì. Con il piano Studio puoi invitare utenti illimitati tramite un semplice codice invito. Ogni membro avrà il suo accesso con i dati condivisi dello studio.",
  },
];

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <style>{styles}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
          </div>
          <span className="nav-logo-text">ASM</span>
        </div>
        <div className="nav-links">
          <a href="#features">Funzionalità</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <button className="btn-ghost" onClick={() => navigate("/login")}>Accedi</button>
          <button className="btn-primary" onClick={() => navigate("/register")}>Inizia gratis</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge"><div className="hero-badge-dot"></div>Pensato da architetti, per architetti</div>
        <h1>Il gestionale che il tuo studio <span>merita</span></h1>
        <p>Progetti, commesse, timesheet, pratiche burocratiche e agente AI. Tutto in un posto solo, con il design che ti aspetti da un'app moderna.</p>
        <div className="hero-btns">
          <button className="btn-hero-primary" onClick={() => navigate("/register")}>Inizia gratis — nessuna carta</button>
          <button className="btn-hero-ghost">Guarda la demo</button>
        </div>
        <p className="hero-sub">Già usato da studi di architettura a Milano</p>
      </div>

      {/* APP PREVIEW */}
      <div className="preview">
        <div className="preview-bar">
          <div className="preview-dot" style={{ background: "#ff453a" }}></div>
          <div className="preview-dot" style={{ background: "#ff9f0a" }}></div>
          <div className="preview-dot" style={{ background: "#30d158" }}></div>
        </div>
        <div className="preview-screen">
          <div className="preview-sidebar">
            <div className="preview-sidebar-item active"><div className="preview-sidebar-dot"></div>Dashboard</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Progetti</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Commesse</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Timesheet</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Team</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Report</div>
            <div className="preview-sidebar-item"><div className="preview-sidebar-dot"></div>Calendario</div>
          </div>
          <div className="preview-content">
            <div className="preview-stats">
              <div className="preview-stat">
                <div className="preview-stat-label">Progetti attivi</div>
                <div className="preview-stat-value" style={{ color: "#0a84ff" }}>24</div>
              </div>
              <div className="preview-stat">
                <div className="preview-stat-label">Ore questa settimana</div>
                <div className="preview-stat-value" style={{ color: "#30d158" }}>38h</div>
              </div>
              <div className="preview-stat">
                <div className="preview-stat-label">Da incassare</div>
                <div className="preview-stat-value" style={{ color: "#ff9f0a" }}>€42k</div>
              </div>
              <div className="preview-stat">
                <div className="preview-stat-label">Task aperti</div>
                <div className="preview-stat-value" style={{ color: "#ffffff80" }}>87</div>
              </div>
            </div>
            <div className="preview-projects">
              <div className="preview-card">
                <div className="preview-card-title">GIOGIO'S RESTAURANT</div>
                <div className="preview-card-sub">Ember S.R.L.</div>
                <div className="preview-progress-bar"><div className="preview-progress-fill" style={{ width: "82%" }}></div></div>
              </div>
              <div className="preview-card">
                <div className="preview-card-title">K-WAY LONDRA</div>
                <div className="preview-card-sub">K-Way Retail S.R.L.</div>
                <div className="preview-progress-bar"><div className="preview-progress-fill" style={{ width: "96%" }}></div></div>
              </div>
              <div className="preview-card">
                <div className="preview-card-title">SPIGA 20</div>
                <div className="preview-card-sub">Bryan Gaw</div>
                <div className="preview-progress-bar"><div className="preview-progress-fill" style={{ width: "58%" }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="section" id="features">
        <div className="section-label">Funzionalità</div>
        <div className="section-title">Tutto quello che serve,<br />niente di superfluo</div>
        <div className="section-sub">ASM è stato costruito partendo da un problema reale: gestire uno studio di architettura con troppi strumenti diversi.</div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </div>
            <div className="feature-title">Gestione progetti e task</div>
            <div className="feature-desc">Colonne per categoria di lavoro, subtask, assegnazioni al team, date pianificate. Come le Note iPhone, ma per il tuo studio.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <div className="feature-title">Commesse e pagamenti</div>
            <div className="feature-desc">Monitoraggio del credito residuo, suddivisione rate, costi extra, collaboratori. Sai sempre quanto manca da incassare.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </div>
            <div className="feature-title">Timesheet del team</div>
            <div className="feature-desc">Ogni membro registra le ore per progetto. I report aggregano tutto per te: ore per cliente, per membro, per mese.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            </div>
            <div className="feature-title">Pratiche burocratiche</div>
            <div className="feature-desc">OSAP, SCIA, Direzione Lavori, Catasto. Ogni pratica ha la sua colonna task con stato avanzamento sempre visibile.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            </div>
            <div className="feature-title">Agente AI integrato</div>
            <div className="feature-desc">Chiedi "chi devo sollecitare?" o "quante ore ha fatto Giulia questo mese?" e ottieni una risposta precisa basata sui tuoi dati reali.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <div className="feature-title">Multi-studio e team</div>
            <div className="feature-desc">Ogni studio ha i suoi dati isolati. Invita i colleghi con un codice, assegna ruoli, vedi le statistiche di ognuno.</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-item-value">59+</div>
            <div className="stat-item-label">Progetti gestiti</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-value">500+</div>
            <div className="stat-item-label">Ore tracciate</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-value">6</div>
            <div className="stat-item-label">Membri del team</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-value">€54k</div>
            <div className="stat-item-label">Commesse monitorate</div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="pricing-section" id="pricing">
        <div className="section-label" style={{ textAlign: "center" }}>Pricing</div>
        <div className="section-title" style={{ textAlign: "center" }}>Semplice e trasparente</div>
        <div style={{ fontSize: "16px", color: "#ffffff60", textAlign: "center" }}>Nessuna sorpresa. Cancelli quando vuoi.</div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-plan">Free</div>
            <div className="pricing-price">€0<span>/mese</span></div>
            <div className="pricing-desc">Per iniziare a esplorare</div>
            <ul className="pricing-features">
              <li><CheckIcon />1 studio</li>
              <li><CheckIcon />Max 2 utenti</li>
              <li><CheckIcon />5 progetti attivi</li>
              <li><CheckIcon />3 commesse</li>
              <li className="muted"><CheckIcon />Report avanzato</li>
              <li className="muted"><CheckIcon />Agente AI</li>
            </ul>
            <button className="btn-pricing btn-pricing-outline" onClick={() => navigate("/register")}>Inizia gratis</button>
          </div>
          <div className="pricing-card featured">
            <div className="pricing-badge">Più popolare</div>
            <div className="pricing-plan">Studio</div>
            <div className="pricing-price">€29<span>/mese</span></div>
            <div className="pricing-desc">Per studi da 2 a 10 persone</div>
            <ul className="pricing-features">
              <li><CheckIcon />1 studio</li>
              <li><CheckIcon />Utenti illimitati</li>
              <li><CheckIcon />Progetti illimitati</li>
              <li><CheckIcon />Commesse illimitate</li>
              <li><CheckIcon />Report completo + CSV</li>
              <li><CheckIcon />Agente AI integrato</li>
            </ul>
            <button className="btn-pricing btn-pricing-filled" onClick={() => navigate("/register")}>Prova 30 giorni gratis</button>
          </div>
          <div className="pricing-card">
            <div className="pricing-plan">Pro</div>
            <div className="pricing-price">€59<span>/mese</span></div>
            <div className="pricing-desc">Per studi in crescita</div>
            <ul className="pricing-features">
              <li><CheckIcon />Tutto di Studio</li>
              <li><CheckIcon />Multi-studio</li>
              <li><CheckIcon />Logo personalizzato</li>
              <li><CheckIcon />Supporto prioritario</li>
              <li><CheckIcon />Export dati avanzato</li>
              <li><CheckIcon />API access</li>
            </ul>
            <button className="btn-pricing btn-pricing-outline">Contattaci</button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-section" id="faq">
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="section-label" style={{ textAlign: "center" }}>FAQ</div>
          <div className="section-title" style={{ textAlign: "center" }}>Domande frequenti</div>
        </div>
        {faqData.map((item, index) => (
          <div key={index} className="faq-item" onClick={() => toggleFaq(index)}>
            <div className="faq-question">
              {item.q}
              <span className="faq-toggle">{openFaq === index ? "−" : "+"}</span>
            </div>
            {openFaq === index && (
              <div className="faq-answer">{item.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA FINALE */}
      <div className="cta-section">
        <h2>Pronto a semplificare<br />il tuo studio?</h2>
        <p>Inizia gratis oggi. Nessuna carta di credito richiesta.</p>
        <button className="btn-hero-primary" onClick={() => navigate("/register")}>Inizia gratis adesso</button>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div className="footer-text">© 2026 ASM - Architect Studio Management. Fatto a Milano.</div>
        <div className="footer-links">
          <a>Privacy</a>
          <a>Termini</a>
          <a>Contatti</a>
        </div>
      </div>
    </div>
  );
}
