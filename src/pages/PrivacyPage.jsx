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
};

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <main style={s.page}>
      <div style={s.wrap}>

        <button onClick={() => navigate(-1)} style={s.backBtn}>← Torna indietro</button>

        <h1 style={s.h1}>Informativa sul Trattamento dei Dati Personali</h1>
        <p style={s.meta}>
          ASM – Architect Studio Management · Versione 2.1 – 26 maggio 2026<br />
          Ai sensi degli artt. 13-14 Reg. UE 2016/679 (GDPR) e D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018
        </p>

        <div style={s.body}>

          <h2 style={s.h2}>1. Titolare del trattamento</h2>
          <div style={s.box}>
            <span style={s.lbl}>Titolare</span>
            <p style={{ ...s.p, marginBottom: 4 }}><strong style={{ color: "#fff" }}>Giacomo Coviello, architetto libero professionista</strong></p>
            <p style={{ ...s.p, marginBottom: 4 }}>Sede operativa: Milano (MI), Italia</p>
            <p style={{ ...s.p, marginBottom: 0 }}>Email privacy: <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a></p>
          </div>
          <p style={s.p}>
            Il Titolare non ha l&apos;obbligo di nomina di un Responsabile della Protezione dei Dati (DPO) ai sensi dell&apos;art. 37 GDPR,
            in quanto non rientra nelle categorie di cui ai commi 1(b) e 1(c) del medesimo articolo.
          </p>
          <p style={s.p}>
            Quando l&apos;Utente carica nel Servizio dati personali dei propri clienti (es. nome e recapiti del committente di una commessa),
            l&apos;Utente agisce come Titolare autonomo di tali dati; il Fornitore agisce come Responsabile del trattamento ai sensi
            dell&apos;art. 28 GDPR limitatamente all&apos;infrastruttura tecnica. Su richiesta è disponibile la firma di un apposito Data Processing Agreement (DPA).
          </p>

          <h2 style={s.h2}>2. Categorie di dati trattati e origine</h2>

          <h3 style={s.h3}>2.1 Dati forniti direttamente dall&apos;Utente in fase di registrazione</h3>
          <ul style={s.ul}>
            <li style={s.li}>Nome, cognome, indirizzo email professionale.</li>
            <li style={s.li}>Nome dello studio, ruolo professionale.</li>
            <li style={s.li}>Password (conservata esclusivamente in forma di hash bcrypt — mai in chiaro).</li>
          </ul>

          <h3 style={s.h3}>2.2 Dati forniti durante l&apos;utilizzo del Servizio</h3>
          <ul style={s.ul}>
            <li style={s.li}>Dati delle commesse: denominazione del progetto, dati del committente (nome, recapiti), importi, date, tipologia di lavoro, documenti allegati.</li>
            <li style={s.li}>Dati di fatturazione: ragione sociale, P.IVA o codice fiscale, indirizzo di fatturazione (trattati da Stripe per i pagamenti — il Fornitore ne riceve solo un riepilogo anonimizzato).</li>
            <li style={s.li}>Dati del team: nome e email dei collaboratori aggiunti allo Studio dall&apos;amministratore.</li>
            <li style={s.li}>Dati del timesheet: ore lavorate, progetto di riferimento, note.</li>
          </ul>

          <h3 style={s.h3}>2.3 Dati raccolti automaticamente</h3>
          <ul style={s.ul}>
            <li style={s.li}>Dati tecnici: indirizzo IP, tipo e versione del browser, sistema operativo, dispositivo utilizzato.</li>
            <li style={s.li}>Dati di utilizzo: pagine visitate nell&apos;app, funzionalità utilizzate, timestamp di accesso e logout, azioni eseguite.</li>
            <li style={s.li}>Log di sicurezza: tentativi di accesso, modifiche alle impostazioni account.</li>
          </ul>

          <h3 style={s.h3}>2.4 Dati che non raccogliamo</h3>
          <ul style={s.ul}>
            <li style={s.li}>Categorie particolari di dati (salute, opinioni politiche, dati biometrici, ecc.) ai sensi dell&apos;art. 9 GDPR.</li>
            <li style={s.li}>Dati di pagamento (carte di credito, IBAN): gestiti esclusivamente da Stripe Inc. con certificazione PCI DSS Level 1. Il Fornitore non vede né conserva tali dati.</li>
            <li style={s.li}>Dati di minori di 18 anni: il Servizio è destinato esclusivamente a professionisti adulti.</li>
          </ul>

          <h2 style={s.h2}>3. Finalità e basi giuridiche del trattamento</h2>

          <h3 style={s.h3}>3.1 Erogazione del Servizio (art. 6.1.b GDPR — esecuzione del contratto)</h3>
          <ul style={s.ul}>
            <li style={s.li}>Creazione e gestione dell&apos;account.</li>
            <li style={s.li}>Fornitura di tutte le funzionalità della piattaforma.</li>
            <li style={s.li}>Invio di comunicazioni di servizio (conferma registrazione, reset password, notifiche di sistema).</li>
            <li style={s.li}>Gestione delle richieste di assistenza.</li>
          </ul>

          <h3 style={s.h3}>3.2 Gestione dei pagamenti (art. 6.1.b GDPR — esecuzione del contratto)</h3>
          <ul style={s.ul}>
            <li style={s.li}>Elaborazione degli abbonamenti tramite Stripe.</li>
            <li style={s.li}>Fatturazione e gestione dello storico delle transazioni.</li>
            <li style={s.li}>Gestione di disdette, rimborsi e mancati pagamenti.</li>
          </ul>

          <h3 style={s.h3}>3.3 Adempimenti legali e fiscali (art. 6.1.c GDPR — obbligo legale)</h3>
          <ul style={s.ul}>
            <li style={s.li}>Conservazione delle registrazioni contabili ai sensi del D.P.R. 633/1972 e D.P.R. 600/1973 (10 anni).</li>
            <li style={s.li}>Risposta a richieste di autorità competenti nei casi previsti dalla legge.</li>
          </ul>

          <h3 style={s.h3}>3.4 Legittimo interesse del Fornitore (art. 6.1.f GDPR)</h3>
          <ul style={s.ul}>
            <li style={s.li}>Sicurezza della piattaforma: rilevamento di accessi non autorizzati, attività fraudolente, attacchi informatici.</li>
            <li style={s.li}>Analisi aggregate e anonimizzate sull&apos;utilizzo del Servizio per il miglioramento delle funzionalità (nessun dato individualmente identificabile).</li>
            <li style={s.li}>Tutela dei diritti del Fornitore in sede giudiziale o stragiudiziale.</li>
          </ul>
          <p style={s.p}>
            L&apos;interessato ha il diritto di opporsi al trattamento basato sul legittimo interesse in qualsiasi momento (art. 21 GDPR),
            inviando richiesta a <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a>.
          </p>

          <h3 style={s.h3}>3.5 Consenso (art. 6.1.a GDPR)</h3>
          <p style={s.p}>
            Invio di comunicazioni commerciali, newsletter e aggiornamenti su nuove funzionalità: solo previo consenso esplicito,
            revocabile in qualsiasi momento senza pregiudizio per la liceità del trattamento precedente.
            Utilizzo di cookie analitici non essenziali (dettagli nella Cookie Policy).
          </p>

          <h2 style={s.h2}>4. Modalità di trattamento</h2>
          <p style={s.p}>
            Il trattamento avviene mediante strumenti elettronici automatizzati. I dati sono conservati su server di Supabase Inc.
            (v. sezione 5). Non viene effettuato alcun trattamento manuale sistematico dei dati dell&apos;Utente da parte del Fornitore,
            salvo specifiche richieste di supporto. Non vengono adottati processi decisionali automatizzati né profilazione degli
            Utenti ai sensi dell&apos;art. 22 GDPR.
          </p>

          <h2 style={s.h2}>5. Responsabili del trattamento e trasferimenti extra-UE</h2>
          <p style={s.p}>
            Il Fornitore si avvale dei seguenti sub-responsabili del trattamento (art. 28 GDPR), con i quali ha accettato termini
            contrattuali conformi al GDPR:
          </p>

          <div style={s.box}>
            <span style={s.lbl}>Supabase Inc.</span>
            <p style={{ ...s.p, marginBottom: 4 }}><strong style={s.em}>Ruolo:</strong> database principale, autenticazione, storage file, edge functions. Sede: San Francisco, CA, USA.</p>
            <p style={{ ...s.p, marginBottom: 4 }}>Trasferimento extra-UE garantito tramite Standard Contractual Clauses (SCC) – decisione Commissione Europea 2021/914. Misure aggiuntive: crittografia a riposo e in transito, Row Level Security per isolamento dati tra Utenti diversi.</p>
            <p style={{ ...s.p, marginBottom: 0 }}>
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={s.link}>supabase.com/privacy</a>
              {" · "}
              <a href="https://supabase.com/dpa" target="_blank" rel="noopener noreferrer" style={s.link}>supabase.com/dpa</a>
            </p>
          </div>

          <div style={s.box}>
            <span style={s.lbl}>Vercel Inc.</span>
            <p style={{ ...s.p, marginBottom: 4 }}><strong style={s.em}>Ruolo:</strong> hosting e deployment dell&apos;applicazione frontend; i dati dell&apos;Utente non vengono conservati permanentemente su Vercel (solo log temporanei di accesso). Sede: San Francisco, CA, USA.</p>
            <p style={{ ...s.p, marginBottom: 0 }}>Trasferimento extra-UE garantito tramite SCC. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={s.link}>vercel.com/legal/privacy-policy</a></p>
          </div>

          <div style={{ ...s.box, marginBottom: 20 }}>
            <span style={s.lbl}>Stripe Inc.</span>
            <p style={{ ...s.p, marginBottom: 4 }}><strong style={s.em}>Ruolo:</strong> elaborazione pagamenti, gestione abbonamenti, emissione ricevute. Certificazione PCI DSS Level 1. Sede: South San Francisco, CA, USA.</p>
            <p style={{ ...s.p, marginBottom: 0 }}>Trasferimento extra-UE garantito tramite SCC. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={s.link}>stripe.com/privacy</a></p>
          </div>

          <p style={s.p}>
            Il Fornitore non trasferisce dati a ulteriori paesi terzi né li condivide con altri soggetti al di fuori di quanto indicato
            nella presente informativa, salvo obbligo di legge o ordine dell&apos;autorità competente.
          </p>

          <h2 style={s.h2}>6. Periodo di conservazione</h2>
          <ul style={s.ul}>
            <li style={s.li}>Dati dell&apos;account e di utilizzo: per tutta la durata del rapporto contrattuale + 30 giorni dalla cancellazione dell&apos;account, poi cancellazione definitiva.</li>
            <li style={s.li}>Dati di fatturazione e transazioni: 10 anni dalla data della fattura, ai sensi della normativa fiscale italiana.</li>
            <li style={s.li}>Log di sicurezza e accesso: massimo 12 mesi dalla registrazione del log.</li>
            <li style={s.li}>Dati trattati per legittimo interesse (es. analisi aggregate): massimo 24 mesi in forma anonimizzata.</li>
            <li style={s.li}>Dati trattati sulla base del consenso: fino alla revoca del consenso + 30 giorni per l&apos;aggiornamento dei sistemi.</li>
          </ul>
          <p style={s.p}>Alla scadenza dei termini di conservazione, i dati vengono cancellati o anonimizzati in modo irreversibile.</p>

          <h2 style={s.h2}>7. Diritti dell&apos;interessato (artt. 15-22 GDPR)</h2>
          <p style={s.p}>L&apos;Utente ha il diritto di:</p>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>Accesso (art. 15):</strong> ottenere conferma del trattamento e ricevere copia dei propri dati personali.</li>
            <li style={s.li}><strong style={s.em}>Rettifica (art. 16):</strong> ottenere la correzione di dati inesatti o l&apos;integrazione di dati incompleti.</li>
            <li style={s.li}><strong style={s.em}>Cancellazione / &quot;diritto all&apos;oblio&quot; (art. 17):</strong> ottenere la cancellazione dei propri dati, salvo obblighi di conservazione legale.</li>
            <li style={s.li}><strong style={s.em}>Limitazione del trattamento (art. 18):</strong> ottenere la limitazione del trattamento nei casi previsti.</li>
            <li style={s.li}><strong style={s.em}>Portabilità (art. 20):</strong> ricevere i dati forniti in un formato strutturato e leggibile da dispositivo automatico.</li>
            <li style={s.li}><strong style={s.em}>Opposizione (art. 21):</strong> opporsi al trattamento basato sul legittimo interesse o per scopi di marketing diretto.</li>
            <li style={s.li}><strong style={s.em}>Revoca del consenso:</strong> revocare in qualsiasi momento il consenso prestato, senza pregiudizio per la liceità del trattamento precedente.</li>
            <li style={s.li}><strong style={s.em}>Reclamo al Garante:</strong> proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={s.link}>garanteprivacy.it</a>).</li>
          </ul>
          <p style={s.p}>
            Per esercitare i propri diritti: <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a>.
            Il Fornitore risponderà entro 30 giorni dalla ricezione della richiesta.
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
