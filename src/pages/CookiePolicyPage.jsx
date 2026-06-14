import { useNavigate } from "react-router-dom";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const s = {
  page: { minHeight: "100vh", background: "#1c1c1e", padding: "40px 20px" },
  wrap: { maxWidth: 800, margin: "0 auto" },
  backBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
    color: "rgba(255,255,255,0.6)", padding: "7px 16px", marginBottom: 32,
    ...mono, fontSize: 12, letterSpacing: "0.05em",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  h1: { fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 },
  meta: { ...mono, fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 40 },
  body: { color: "rgba(255,255,255,0.75)", lineHeight: 1.9, fontSize: 14 },
  h2: { fontSize: 17, fontWeight: 700, color: "#fff", marginTop: 36, marginBottom: 10 },
  h3: { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginTop: 20, marginBottom: 6 },
  p: { marginBottom: 14 },
  ul: { paddingLeft: 20, marginBottom: 14 },
  li: { marginBottom: 6 },
  box: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, padding: "16px 20px", marginBottom: 10,
  },
  lbl: { ...mono, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, display: "block" },
  link: { color: "#4f8ef7", textDecoration: "none" },
  em: { color: "rgba(255,255,255,0.9)" },
  badge: {
    display: "inline-block", ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
    padding: "2px 8px", borderRadius: 3, background: "rgba(34,197,94,0.12)", color: "#4ade80",
    border: "1px solid rgba(34,197,94,0.2)", marginLeft: 8,
  },
  badgeNo: {
    display: "inline-block", ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
    padding: "2px 8px", borderRadius: 3, background: "rgba(100,100,100,0.12)", color: "rgba(255,255,255,0.35)",
    border: "1px solid rgba(255,255,255,0.1)", marginLeft: 8,
  },
};

export default function CookiePolicyPage() {
  const navigate = useNavigate();

  return (
    <main style={s.page}>
      <div style={s.wrap}>

        <button onClick={() => navigate(-1)} style={s.backBtn}>← Torna indietro</button>

        <h1 style={s.h1}>Cookie Policy</h1>
        <p style={s.meta}>
          ASM – Architect Studio Management · Versione 2.0 – 25 maggio 2026<br />
          Ai sensi del D.Lgs. 196/2003, Provvedimento Garante 8 maggio 2014 n. 229 e Linee Guida EDPB
        </p>

        <div style={s.body}>

          <h2 style={s.h2}>1. Cosa sono i cookie e tecnologie simili</h2>
          <p style={s.p}>
            I cookie sono piccoli file di testo che vengono salvati sul dispositivo dell&apos;utente quando visita un sito web
            o utilizza un&apos;applicazione web. Oltre ai cookie tradizionali, ASM può utilizzare tecnologie simili come
            localStorage (memoria locale del browser) e sessionStorage, che svolgono funzioni analoghe senza inviare dati al
            server a ogni richiesta.
          </p>
          <p style={s.p}>
            La presente policy descrive tutte le tecnologie di tracciamento utilizzate da ASM,
            indipendentemente dal loro meccanismo tecnico.
          </p>

          <h2 style={s.h2}>2. Tipologie di cookie utilizzati</h2>

          <h3 style={s.h3}>
            2.1 Cookie tecnici essenziali
            <span style={s.badge}>Nessun consenso richiesto</span>
          </h3>
          <p style={s.p}>
            Questi cookie sono strettamente necessari al funzionamento del Servizio. Senza di essi, funzionalità fondamentali
            come l&apos;accesso all&apos;account non sono possibili. Non richiedono consenso ai sensi dell&apos;art. 122 D.Lgs. 196/2003
            e del Provvedimento Garante n. 229/2014.
          </p>

          <div style={s.box}>
            <span style={s.lbl}>Cookie di sessione e autenticazione (Supabase)</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Gestiscono il token JWT di autenticazione che mantiene l&apos;Utente connesso. Vengono eliminati al logout o alla scadenza della sessione.</p>
            <p style={{ ...s.p, marginBottom: 0, ...mono, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Durata: sessione / max 7 giorni con &ldquo;ricordami&rdquo;</p>
          </div>

          <div style={s.box}>
            <span style={s.lbl}>Cookie di sicurezza CSRF</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Proteggono da attacchi Cross-Site Request Forgery. Generati e verificati automaticamente per ogni richiesta sensibile.</p>
            <p style={{ ...s.p, marginBottom: 0, ...mono, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Durata: sessione</p>
          </div>

          <div style={s.box}>
            <span style={s.lbl}>Preferenze interfaccia (localStorage)</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Memorizzano le preferenze dell&apos;Utente come tema (dark/light mode) e impostazioni di visualizzazione.</p>
            <p style={{ ...s.p, marginBottom: 0, ...mono, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Durata: persistente fino a cancellazione manuale</p>
          </div>

          <div style={{ ...s.box, marginBottom: 20 }}>
            <span style={s.lbl}>Stato consenso cookie (localStorage &ldquo;asm_cookie_consent&rdquo;)</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Memorizza la scelta dell&apos;Utente in merito ai cookie non essenziali per evitare di riproporre il banner.</p>
            <p style={{ ...s.p, marginBottom: 0, ...mono, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Durata: 12 mesi</p>
          </div>

          <h3 style={s.h3}>
            2.2 Cookie analitici
            <span style={s.badgeNo}>Non utilizzati</span>
          </h3>
          <p style={s.p}>
            ASM non utilizza strumenti di analytics di terze parti. Vengono raccolti esclusivamente log tecnici anonimi
            sull&apos;utilizzo del Servizio tramite l&apos;infrastruttura Supabase, senza tracciamento individuale degli Utenti.
          </p>

          <h3 style={s.h3}>
            2.3 Cookie di terze parti per funzionalità del Servizio
          </h3>
          <div style={s.box}>
            <span style={s.lbl}>Stripe</span>
            <p style={{ ...s.p, marginBottom: 0 }}>
              Durante le sessioni di pagamento, Stripe Inc. può impostare propri cookie tecnici per prevenire frodi,
              garantire la sicurezza delle transazioni e ricordare le sessioni di checkout. Questi cookie sono soggetti
              alla <a href="https://stripe.com/cookies-policy" target="_blank" rel="noopener noreferrer" style={s.link}>Cookie Policy di Stripe</a>{" "}
              e alla sua <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={s.link}>Privacy Policy</a>.
              Il Fornitore non ha accesso a tali cookie.
            </p>
          </div>

          <h3 style={s.h3}>
            2.4 Cookie di marketing e profilazione
            <span style={s.badgeNo}>Non utilizzati</span>
          </h3>
          <p style={s.p}>
            ASM non utilizza cookie di marketing, profilazione o retargeting di alcun tipo.
            Non vengono installati pixel di tracking (es. Meta Pixel, Google Ads) né vengono condivisi dati con reti pubblicitarie.
          </p>

          <h2 style={s.h2}>3. Durata dei cookie</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>Cookie di sessione:</strong> vengono eliminati automaticamente alla chiusura del browser o al logout.</li>
            <li style={s.li}><strong style={s.em}>Cookie persistenti:</strong> rimangono sul dispositivo per il periodo indicato nella sezione 2. L&apos;Utente può cancellarli in qualsiasi momento dalle impostazioni del browser.</li>
          </ul>

          <h2 style={s.h2}>4. Come gestire i cookie</h2>
          <p style={s.p}>
            L&apos;Utente può gestire, disabilitare o eliminare i cookie tramite le impostazioni del proprio browser:
          </p>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>Google Chrome:</strong> chrome://settings/cookies</li>
            <li style={s.li}><strong style={s.em}>Mozilla Firefox:</strong> about:preferences#privacy</li>
            <li style={s.li}><strong style={s.em}>Safari (Mac):</strong> Preferenze › Privacy › Gestisci dati siti web</li>
            <li style={s.li}><strong style={s.em}>Safari (iOS):</strong> Impostazioni › Safari › Avanzate › Dati dei siti web</li>
            <li style={s.li}><strong style={s.em}>Microsoft Edge:</strong> edge://settings/cookies</li>
          </ul>
          <p style={s.p}>
            <strong style={s.em}>Attenzione:</strong> la disabilitazione dei cookie tecnici essenziali (in particolare i cookie di autenticazione)
            renderà impossibile accedere all&apos;account e utilizzare il Servizio.
          </p>

          <h2 style={s.h2}>5. Cookie banner e gestione del consenso</h2>
          <p style={s.p}>
            Al primo accesso all&apos;applicazione, viene mostrato un banner informativo. L&apos;Utente può scegliere tra:
          </p>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>&ldquo;Accetta tutti&rdquo;:</strong> consente l&apos;utilizzo dei cookie tecnici essenziali.</li>
            <li style={s.li}><strong style={s.em}>&ldquo;Solo essenziali&rdquo;:</strong> consente esclusivamente i cookie tecnici essenziali.</li>
          </ul>
          <p style={s.p}>
            La scelta viene memorizzata in localStorage (&ldquo;asm_cookie_consent&rdquo;) per 12 mesi.
            L&apos;Utente può modificare le proprie preferenze in qualsiasi momento dalla sezione &ldquo;Privacy&rdquo; nelle impostazioni dell&apos;account.
          </p>

          <h2 style={s.h2}>6. Base giuridica</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>Cookie tecnici essenziali:</strong> legittimo interesse del Fornitore (art. 6.1.f GDPR) e necessità contrattuale (art. 6.1.b GDPR). Non richiedono consenso ai sensi del D.Lgs. 196/2003 art. 122 c. 1.</li>
            <li style={s.li}><strong style={s.em}>Cookie analitici:</strong> non utilizzati — consenso non richiesto.</li>
          </ul>

          <h2 style={s.h2}>7. Aggiornamenti della Cookie Policy</h2>
          <p style={s.p}>
            La presente Cookie Policy viene aggiornata in caso di variazioni nelle tecnologie utilizzate o nella normativa applicabile.
            La data di ultima modifica è indicata in cima al documento. Per modifiche sostanziali (es. introduzione di nuove categorie
            di cookie), l&apos;Utente verrà informato via email o tramite avviso in-app.
          </p>

          <h2 style={s.h2}>8. Contatti</h2>
          <p style={s.p}>
            Per qualsiasi domanda sui cookie e sulle tecnologie di tracciamento utilizzate:{" "}
            <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a>
          </p>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
            © {new Date().getFullYear()} Giacomo Coviello, architetto libero professionista · Tutti i diritti riservati
          </p>
        </div>

      </div>
    </main>
  );
}
