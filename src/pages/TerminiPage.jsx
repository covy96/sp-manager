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
  warning: {
    background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: 8, padding: "14px 18px", marginBottom: 16,
    color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7,
  },
  lbl: { ...mono, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, display: "block" },
  link: { color: "#4f8ef7", textDecoration: "none" },
  em: { color: "rgba(255,255,255,0.9)" },
};

export default function TerminiPage() {
  const navigate = useNavigate();

  return (
    <main style={s.page}>
      <div style={s.wrap}>

        <button onClick={() => navigate(-1)} style={s.backBtn}>← Torna indietro</button>

        <h1 style={s.h1}>Termini e Condizioni d&apos;uso</h1>
        <p style={s.meta}>
          ASM – Architect Studio Management · Versione 2.2 – 26 maggio 2026
        </p>

        <div style={s.body}>

          <h2 style={s.h2}>1. Definizioni</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>&ldquo;Fornitore&rdquo;:</strong> Giacomo Coviello, architetto libero professionista, con sede in Milano (MI), email: <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a> — soggetto che sviluppa ed eroga il Servizio.</li>
            <li style={s.li}><strong style={s.em}>&ldquo;Utente&rdquo; o &ldquo;Studio&rdquo;:</strong> il professionista o lo studio professionale che accetta i presenti Termini e utilizza il Servizio esclusivamente nell&apos;ambito della propria attività professionale o imprenditoriale. Il Servizio non è destinato a consumatori ai sensi del D.Lgs. 206/2005 (Codice del Consumo).</li>
            <li style={s.li}><strong style={s.em}>&ldquo;Servizio&rdquo;:</strong> la piattaforma SaaS ASM – Architect Studio Management, comprensiva di tutte le funzionalità disponibili nel piano sottoscritto.</li>
            <li style={s.li}><strong style={s.em}>&ldquo;Dati dell&apos;Utente&rdquo;:</strong> qualsiasi dato, informazione o contenuto caricato, generato o trasmesso dall&apos;Utente tramite il Servizio.</li>
            <li style={s.li}><strong style={s.em}>&ldquo;Abbonamento&rdquo;:</strong> il contratto a pagamento che regola l&apos;accesso alle funzionalità premium del Servizio.</li>
          </ul>

          <h2 style={s.h2}>2. Accettazione e ambito di applicazione</h2>
          <p style={s.p}>
            L&apos;accesso e l&apos;utilizzo del Servizio costituisce accettazione integrale e incondizionata dei presenti Termini.
            Se non si accettano i presenti Termini, è necessario cessare immediatamente l&apos;utilizzo del Servizio.
          </p>
          <p style={s.p}>
            I presenti Termini si applicano esclusivamente a soggetti che agiscono nell&apos;esercizio di un&apos;attività professionale o d&apos;impresa.
            Utilizzando il Servizio, l&apos;Utente dichiara e garantisce di non essere un consumatore ai sensi del Codice del Consumo italiano
            e di avere piena capacità giuridica per concludere il presente contratto.
          </p>
          <p style={s.p}>
            In caso di utilizzo del Servizio per conto di uno studio professionale, la persona fisica che completa la registrazione
            dichiara di avere i poteri necessari per vincolare lo Studio ai presenti Termini.
          </p>

          <h2 style={s.h2}>3. Descrizione del Servizio e stato di sviluppo</h2>
          <p style={s.p}>
            ASM è un software gestionale SaaS destinato a studi di architettura e professionisti tecnici. Il Servizio offre funzionalità di:
            gestione commesse e progetti, monitoraggio pagamenti, timesheet, task management, assistente AI integrato e reportistica.
          </p>
          <div style={s.warning}>
            <strong>IL SERVIZIO VIENE FORNITO &ldquo;COSÌ COM&apos;È&rdquo; (AS IS) E &ldquo;COME DISPONIBILE&rdquo; (AS AVAILABLE)</strong>,
            nella versione e con le funzionalità disponibili al momento dell&apos;utilizzo. Il Servizio è in sviluppo attivo:
            funzionalità esistenti possono essere modificate, sospese o rimosse, e nuove funzionalità possono essere aggiunte,
            anche senza preavviso, salvo modifiche sostanziali al piano a pagamento per le quali sarà dato preavviso di almeno 14 giorni.
          </div>
          <p style={s.p}>
            L&apos;assistente AI integrato produce output di natura orientativa e non costituisce consulenza professionale, legale, fiscale o tecnica.
            Il Fornitore non è responsabile per decisioni prese sulla base degli output dell&apos;AI.
          </p>

          <h2 style={s.h2}>4. Registrazione, account e sicurezza</h2>
          <p style={s.p}>
            Per utilizzare ASM è necessario creare un account fornendo dati accurati, completi e aggiornati.
            L&apos;Utente è l&apos;unico responsabile della riservatezza delle proprie credenziali di accesso e di tutte le attività
            eseguite tramite il proprio account, autorizzate o meno.
          </p>
          <p style={s.p}>L&apos;Utente si impegna a:</p>
          <ul style={s.ul}>
            <li style={s.li}>Scegliere una password sicura e non condividerla con terzi non autorizzati.</li>
            <li style={s.li}>Notificare immediatamente il Fornitore di qualsiasi accesso non autorizzato o violazione della sicurezza del proprio account.</li>
            <li style={s.li}>Disconnettersi al termine di ogni sessione su dispositivi condivisi.</li>
          </ul>
          <p style={s.p}>
            Il Fornitore si riserva il diritto di sospendere o terminare account per i quali sussistano fondati motivi di compromissione
            della sicurezza, attività fraudolenta o violazione dei presenti Termini.
            È vietata la creazione di account anonimi, falsi, multipli per eludere limitazioni di piano, o per conto di terzi senza esplicita autorizzazione scritta.
          </p>

          <h2 style={s.h2}>5. Piani, abbonamenti e pagamenti</h2>

          <h3 style={s.h3}>5.1 Piani disponibili</h3>
          <ul style={s.ul}>
            <li style={s.li}><strong style={s.em}>Piano Free:</strong> gratuito, con limitazioni su utenti, progetti e commesse attive. Il Fornitore si riserva il diritto di modificare o eliminare il piano Free con preavviso di 30 giorni.</li>
            <li style={s.li}><strong style={s.em}>Piano Studio:</strong> €14,99/mese + IVA ove applicabile.</li>
            <li style={s.li}><strong style={s.em}>Piano Pro:</strong> €29,99/mese + IVA ove applicabile.</li>
          </ul>
          <p style={s.p}>
            I prezzi sono espressi in Euro. Il Fornitore si riserva il diritto di modificare i prezzi con preavviso scritto di almeno 30 giorni.
            Le modifiche di prezzo non si applicano ai periodi di fatturazione già pagati.
          </p>

          <h3 style={s.h3}>5.2 Fatturazione e rinnovo automatico</h3>
          <p style={s.p}>
            Gli abbonamenti a pagamento hanno durata mensile e si rinnovano automaticamente alla scadenza, addebitando il costo del
            periodo successivo sul metodo di pagamento registrato, salvo disdetta preventiva. I pagamenti sono processati tramite
            Stripe Inc. (PCI DSS Level 1). Il Fornitore non conserva mai dati di carte di credito o di pagamento.
          </p>
          <p style={s.p}>
            In caso di mancato pagamento, il Fornitore invierà un avviso via email. Se il pagamento non viene regolarizzato entro
            7 giorni, l&apos;account verrà convertito automaticamente al piano Free. I dati dell&apos;Utente rimarranno accessibili.
          </p>

          <h3 style={s.h3}>5.3 Disdetta</h3>
          <p style={s.p}>
            L&apos;Utente può disdire l&apos;abbonamento in qualsiasi momento dalla sezione &ldquo;Fatturazione&rdquo; del proprio account.
            La disdetta ha effetto immediato sulla attivazione di nuovi rinnovi; l&apos;accesso alle funzionalità premium rimane
            attivo fino al termine del periodo di fatturazione già pagato.
          </p>

          <h3 style={s.h3}>5.4 Rimborsi</h3>
          <p style={s.p}>
            In linea generale non vengono erogati rimborsi pro-rata per periodi non utilizzati. Fanno eccezione:
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Casi in cui il Servizio risulti non disponibile per cause imputabili al Fornitore per un periodo continuativo superiore a 72 ore (credito proporzionale sul periodo successivo).</li>
            <li style={s.li}>Eventuale obbligo di legge.</li>
            <li style={s.li}>Accordo scritto tra le parti.</li>
          </ul>
          <p style={s.p}>
            L&apos;Utente che ritiene di avere diritto a un rimborso deve inviare richiesta motivata a{" "}
            <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a> entro 14 giorni dall&apos;evento che lo giustifica.
          </p>

          <h2 style={s.h2}>6. Utilizzo consentito e condotte vietate</h2>
          <p style={s.p}>Il Servizio è concesso in uso esclusivamente per le finalità professionali legittime dell&apos;Utente. È espressamente vietato:</p>
          <ul style={s.ul}>
            <li style={s.li}>Utilizzare il Servizio per scopi illeciti, fraudolenti, lesivi di diritti di terzi o contrari alla normativa applicabile.</li>
            <li style={s.li}>Effettuare reverse engineering, decompilare, disassemblare o tentare di estrarre il codice sorgente del Servizio.</li>
            <li style={s.li}>Caricare, trasmettere o rendere disponibili contenuti che violino diritti di proprietà intellettuale, segreti industriali o dati personali di terzi in violazione del GDPR.</li>
            <li style={s.li}>Sottoporre il Servizio a stress test, attacchi DDoS, scraping sistematico, crawling automatico o qualsiasi attività che possa compromettere le prestazioni o la sicurezza della piattaforma.</li>
            <li style={s.li}>Condividere le credenziali di accesso con soggetti non appartenenti allo Studio registrato.</li>
            <li style={s.li}>Creare account multipli per eludere le limitazioni del piano Free.</li>
            <li style={s.li}>Sub-licenziare, rivendere, noleggiare o trasferire in qualsiasi forma l&apos;accesso al Servizio a terzi senza previa autorizzazione scritta del Fornitore.</li>
            <li style={s.li}>Tentare di accedere ad account, sistemi o dati di altri Utenti.</li>
          </ul>
          <p style={s.p}>
            La violazione di queste disposizioni può comportare la sospensione immediata dell&apos;account, senza rimborso del periodo residuo,
            e l&apos;eventuale azione legale per i danni cagionati.
          </p>

          <h2 style={s.h2}>7. Proprietà dei Dati dell&apos;Utente</h2>
          <p style={s.p}>
            I Dati dell&apos;Utente rimangono di esclusiva proprietà dell&apos;Utente. Il Fornitore non rivendica alcun diritto di
            proprietà intellettuale sui contenuti caricati nel Servizio.
          </p>
          <p style={s.p}>
            L&apos;Utente concede al Fornitore una licenza limitata, non esclusiva, gratuita, per utilizzare i Dati dell&apos;Utente
            esclusivamente nella misura necessaria all&apos;erogazione e al miglioramento del Servizio, nel rispetto della Privacy Policy.
            Il Fornitore non vende, non cede e non condivide con terzi i Dati dell&apos;Utente, salvo quanto indicato nella Privacy Policy.
          </p>

          <h2 style={s.h2}>8. Proprietà intellettuale del Servizio</h2>
          <p style={s.p}>
            Il Servizio ASM, inclusi il codice sorgente, il design, i loghi, i marchi, la documentazione e tutti i contenuti prodotti
            dal Fornitore, sono protetti dalla normativa applicabile in materia di proprietà intellettuale e sono di esclusiva
            titolarità del Fornitore. I presenti Termini non trasferiscono all&apos;Utente alcun diritto di proprietà intellettuale
            sul Servizio.
          </p>

          <h2 style={s.h2}>9. Disponibilità del Servizio e manutenzione</h2>
          <p style={s.p}>
            Il Fornitore si impegna a garantire la disponibilità del Servizio nella misura del ragionevolmente possibile, senza tuttavia
            fornire garanzie di disponibilità continua (uptime SLA). Il Servizio potrebbe essere temporaneamente non disponibile per:
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Manutenzione programmata (il Fornitore si impegna a comunicarla con ragionevole anticipo).</li>
            <li style={s.li}>Manutenzione di emergenza non programmabile.</li>
            <li style={s.li}>Cause di forza maggiore o eventi al di fuori del ragionevole controllo del Fornitore (es. interruzioni dei servizi infrastrutturali di terze parti come Supabase o Vercel).</li>
          </ul>

          <h2 style={s.h2}>10. Limitazione di responsabilità</h2>
          <p style={s.p}>
            Nella misura massima consentita dalla legge applicabile, il Fornitore non è responsabile per:
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Danni indiretti, consequenziali, incidentali, speciali o punitivi derivanti dall&apos;utilizzo o dall&apos;impossibilità di utilizzo del Servizio.</li>
            <li style={s.li}>Perdita di dati, profitti, opportunità commerciali o avviamento.</li>
            <li style={s.li}>Eventuali errori, inesattezze o omissioni nei contenuti del Servizio.</li>
            <li style={s.li}>Accessi non autorizzati ai dati dell&apos;Utente derivanti da comportamenti dell&apos;Utente stesso (es. condivisione delle credenziali).</li>
            <li style={s.li}>Interruzioni del Servizio causate da terze parti (provider infrastrutturali, ISP, eventi di forza maggiore).</li>
          </ul>
          <p style={s.p}>
            La responsabilità complessiva del Fornitore nei confronti dell&apos;Utente, per qualsiasi causa e a qualsiasi titolo, non potrà
            in nessun caso eccedere l&apos;importo totale pagato dall&apos;Utente negli ultimi 3 mesi di abbonamento precedenti all&apos;evento che
            ha generato la responsabilità.
          </p>

          <h2 style={s.h2}>11. Modifiche ai Termini</h2>
          <p style={s.p}>
            Il Fornitore si riserva il diritto di modificare i presenti Termini in qualsiasi momento. In caso di modifiche sostanziali,
            l&apos;Utente verrà informato via email o tramite avviso in-app con almeno 14 giorni di preavviso. Il proseguimento dell&apos;utilizzo
            del Servizio dopo la notifica costituisce accettazione delle modifiche.
          </p>

          <h2 style={s.h2}>12. Legge applicabile e foro competente</h2>
          <p style={s.p}>
            I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia derivante dall&apos;interpretazione,
            validità o esecuzione dei presenti Termini, le Parti concordano la competenza esclusiva del Foro di Milano,
            con rinuncia a qualsiasi altro foro.
          </p>

          <h2 style={s.h2}>13. Contatti</h2>
          <div style={s.box}>
            <span style={s.lbl}>Giacomo Coviello, architetto libero professionista</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Milano (MI), Italia</p>
            <p style={{ ...s.p, marginBottom: 0 }}>Email: <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a></p>
          </div>

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
