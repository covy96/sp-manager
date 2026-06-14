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
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 13 },
  th: { textAlign: "left", padding: "8px 12px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top" },
};

export default function DpaPage() {
  const navigate = useNavigate();

  return (
    <main style={s.page}>
      <div style={s.wrap}>

        <button onClick={() => navigate(-1)} style={s.backBtn}>← Torna indietro</button>

        <h1 style={s.h1}>Data Processing Agreement (DPA)</h1>
        <p style={s.meta}>
          ASM – Architect Studio Management · Versione 1.1 – 26 maggio 2026<br />
          Accordo sul Trattamento dei Dati Personali ai sensi dell&apos;art. 28 Reg. UE 2016/679 (GDPR)
        </p>

        <div style={s.body}>

          <p style={s.p}>
            Il presente Data Processing Agreement (&ldquo;DPA&rdquo; o &ldquo;Accordo&rdquo;) è parte integrante dei Termini e Condizioni d&apos;uso
            di ASM e si applica automaticamente al momento dell&apos;accettazione degli stessi da parte dell&apos;Utente in fase di registrazione.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={s.box}>
              <span style={s.lbl}>Fornitore (Responsabile del trattamento – art. 28 GDPR)</span>
              <p style={{ ...s.p, marginBottom: 4 }}><strong style={{ color: "#fff" }}>Giacomo Coviello, architetto libero professionista</strong></p>
              <p style={{ ...s.p, marginBottom: 0 }}>Milano (MI), Italia · <a href="mailto:info@asmstudio.it" style={s.link}>info@asmstudio.it</a></p>
            </div>
            <div style={s.box}>
              <span style={s.lbl}>Cliente / Studio (Titolare del trattamento)</span>
              <p style={{ ...s.p, marginBottom: 0 }}>Il professionista o lo studio professionale che utilizza il Servizio ASM e carica nel Servizio dati personali di propri clienti, committenti, collaboratori o altri terzi.</p>
            </div>
          </div>

          <p style={s.p}>
            Con riferimento ai dati personali che il CLIENTE carica nel Servizio nell&apos;ambito della propria attività professionale
            (es. dati anagrafici e di contatto dei committenti, dati dei collaboratori del team), il CLIENTE agisce come Titolare
            autonomo del trattamento ai sensi dell&apos;art. 4(7) GDPR, mentre il FORNITORE agisce come Responsabile del trattamento
            ai sensi dell&apos;art. 4(8) e 28 GDPR, in quanto tratta tali dati per conto e su istruzione del CLIENTE attraverso
            l&apos;infrastruttura tecnica del Servizio.
          </p>
          <p style={s.p}>
            Il presente DPA non si applica ai dati personali dell&apos;Utente trattati dal FORNITORE come Titolare autonomo per
            l&apos;erogazione del Servizio (es. email di registrazione, dati di fatturazione), che sono regolati dall&apos;Informativa sulla Privacy.
          </p>

          <h2 style={s.h2}>Art. 1 — Oggetto e durata</h2>
          <p style={s.p}>
            Il presente DPA disciplina le modalità e le condizioni con cui il FORNITORE tratta dati personali per conto del CLIENTE
            nell&apos;ambito dell&apos;erogazione del Servizio ASM.
          </p>
          <p style={s.p}>
            Il presente Accordo ha la stessa durata del contratto principale (Termini e Condizioni) tra le Parti e si risolve
            automaticamente alla cessazione del medesimo per qualsiasi causa. Alla cessazione, il FORNITORE si impegna a cancellare
            o restituire i dati personali trattati per conto del CLIENTE, secondo le modalità indicate all&apos;art. 9.
          </p>

          <h2 style={s.h2}>Art. 2 — Istruzioni del Titolare</h2>
          <p style={s.p}>
            Il FORNITORE tratta i dati personali del CLIENTE esclusivamente secondo le istruzioni documentate del CLIENTE,
            che si identificano nell&apos;utilizzo del Servizio ASM conforme ai Termini e Condizioni, e nel rispetto del presente DPA.
          </p>
          <p style={s.p}>
            Il FORNITORE informa immediatamente il CLIENTE qualora, a suo giudizio, un&apos;istruzione violi il GDPR o altre
            disposizioni applicabili in materia di protezione dei dati. Salvo diverso accordo scritto tra le Parti, il FORNITORE
            non tratta i dati personali del CLIENTE per finalità proprie, né li cede, vende o divulga a terzi al di fuori
            di quanto previsto dal presente DPA.
          </p>

          <h2 style={s.h2}>Art. 3 — Natura, finalità e categorie di dati trattati</h2>
          <p style={s.p}>
            Il FORNITORE tratta dati personali per conto del CLIENTE al solo fine di erogare le funzionalità del Servizio ASM —
            in particolare: archiviazione e visualizzazione dei dati inseriti dal CLIENTE, esecuzione di query e ricerche,
            backup e ripristino, sicurezza e autenticazione.
          </p>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Categoria di dati</th>
                <th style={s.th}>Tipologia specifica</th>
                <th style={s.th}>Interessati</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Dati identificativi e di contatto</td>
                <td style={s.td}>Nome, cognome, email, telefono (facolt.)</td>
                <td style={s.td}>Utenti dello Studio; clienti/committenti</td>
              </tr>
              <tr>
                <td style={s.td}>Dati professionali</td>
                <td style={s.td}>Ruolo, nome studio, tipologia attività</td>
                <td style={s.td}>Utenti dello Studio</td>
              </tr>
              <tr>
                <td style={s.td}>Dati delle commesse</td>
                <td style={s.td}>Dati committente, importi, date, documenti</td>
                <td style={s.td}>Clienti/committenti dello Studio</td>
              </tr>
              <tr>
                <td style={s.td}>Dati di accesso</td>
                <td style={s.td}>Email, hash password, log accessi</td>
                <td style={s.td}>Utenti dello Studio</td>
              </tr>
              <tr>
                <td style={s.td}>Dati del team</td>
                <td style={s.td}>Nome e email collaboratori</td>
                <td style={s.td}>Collaboratori dello Studio</td>
              </tr>
              <tr>
                <td style={{ ...s.td, borderBottom: "none" }}>Dati di utilizzo</td>
                <td style={{ ...s.td, borderBottom: "none" }}>Azioni eseguite, funzionalità usate, timestamp</td>
                <td style={{ ...s.td, borderBottom: "none" }}>Utenti dello Studio</td>
              </tr>
            </tbody>
          </table>

          <p style={s.p}>
            Il CLIENTE garantisce di non caricare nel Servizio categorie particolari di dati ai sensi dell&apos;art. 9 GDPR
            (dati sulla salute, orientamento sessuale, opinioni politiche, dati biometrici, ecc.) né dati relativi a condanne
            penali ai sensi dell&apos;art. 10 GDPR, salvo previa autorizzazione scritta del FORNITORE.
          </p>
          <p style={s.p}>
            Il CLIENTE è il solo responsabile dell&apos;accuratezza, della legalità e dell&apos;appropriatezza dei dati personali caricati
            nel Servizio. Il CLIENTE garantisce di disporre di idonea base giuridica per il trattamento dei dati dei propri
            clienti/committenti/collaboratori e di aver fornito agli interessati le relative informative ai sensi degli artt. 13-14 GDPR.
          </p>

          <h2 style={s.h2}>Art. 4 — Obblighi del Responsabile del trattamento (FORNITORE)</h2>
          <p style={s.p}>Il FORNITORE si impegna a:</p>
          <ul style={s.ul}>
            <li style={s.li}>Trattare i dati personali del CLIENTE esclusivamente per le finalità indicate nel presente DPA e secondo le istruzioni documentate del CLIENTE.</li>
            <li style={s.li}>Garantire che le persone autorizzate al trattamento dei dati siano vincolate da obblighi di riservatezza adeguati.</li>
            <li style={s.li}>Adottare le misure tecniche e organizzative di sicurezza descritte all&apos;art. 6 del presente DPA.</li>
            <li style={s.li}>Assistere il CLIENTE nell&apos;adempimento degli obblighi di risposta alle richieste di esercizio dei diritti degli interessati (artt. 15-22 GDPR).</li>
            <li style={s.li}>Assistere il CLIENTE nell&apos;adempimento degli obblighi di cui agli artt. 32-36 GDPR (sicurezza, notifica data breach, valutazione d&apos;impatto).</li>
            <li style={s.li}>Mettere a disposizione del CLIENTE tutte le informazioni necessarie a dimostrare il rispetto degli obblighi di cui all&apos;art. 28 GDPR, e consentire attività di audit con ragionevole preavviso (minimo 14 giorni).</li>
            <li style={s.li}>Informare il CLIENTE senza ingiustificato ritardo qualora, a suo giudizio, un&apos;istruzione violi il GDPR o la normativa applicabile.</li>
          </ul>

          <h2 style={s.h2}>Art. 5 — Sub-responsabili del trattamento</h2>
          <p style={s.p}>
            Il CLIENTE, con l&apos;accettazione del presente DPA, autorizza il FORNITORE ad avvalersi dei seguenti Sub-responsabili:
          </p>

          <div style={s.box}>
            <span style={s.lbl}>Supabase Inc. — San Francisco, CA, USA</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Database, autenticazione, storage. Trasferimento extra-UE tramite SCC (decisione 2021/914).</p>
            <p style={{ ...s.p, marginBottom: 0 }}><a href="https://supabase.com/dpa" target="_blank" rel="noopener noreferrer" style={s.link}>supabase.com/dpa</a></p>
          </div>
          <div style={s.box}>
            <span style={s.lbl}>Vercel Inc. — San Francisco, CA, USA</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Hosting e deployment frontend. I dati dell&apos;Utente non vengono conservati permanentemente. Trasferimento extra-UE tramite SCC.</p>
            <p style={{ ...s.p, marginBottom: 0 }}><a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer" style={s.link}>vercel.com/legal/dpa</a></p>
          </div>
          <div style={{ ...s.box, marginBottom: 20 }}>
            <span style={s.lbl}>Stripe Inc. — South San Francisco, CA, USA</span>
            <p style={{ ...s.p, marginBottom: 4 }}>Elaborazione pagamenti. Certificazione PCI DSS Level 1. Trasferimento extra-UE tramite SCC.</p>
            <p style={{ ...s.p, marginBottom: 0 }}><a href="https://stripe.com/legal/dpa" target="_blank" rel="noopener noreferrer" style={s.link}>stripe.com/legal/dpa</a></p>
          </div>

          <p style={s.p}>
            Il FORNITORE comunicherà al CLIENTE, con almeno 15 giorni di preavviso via email, qualsiasi modifica (aggiunta,
            sostituzione o rimozione) dei Sub-responsabili autorizzati. Il CLIENTE che non intenda accettare un nuovo
            Sub-responsabile ha il diritto di notificarlo per iscritto entro 15 giorni dalla comunicazione.
          </p>

          <h2 style={s.h2}>Art. 6 — Misure di sicurezza</h2>
          <p style={s.p}>Il FORNITORE adotta, e mantiene aggiornate, le seguenti misure tecniche e organizzative ai sensi dell&apos;art. 32 GDPR:</p>

          <h3 style={s.h3}>Misure tecniche</h3>
          <ul style={s.ul}>
            <li style={s.li}>Cifratura di tutti i dati in transito tramite <strong style={s.em}>TLS 1.2/1.3</strong> (HTTPS obbligatorio e forzato).</li>
            <li style={s.li}>Cifratura dei dati a riposo gestita dall&apos;infrastruttura Supabase (<strong style={s.em}>AES-256</strong>).</li>
            <li style={s.li}>Hashing delle password con algoritmo <strong style={s.em}>bcrypt</strong> (fattore di costo ≥ 10); le password non sono mai conservate in chiaro.</li>
            <li style={s.li}><strong style={s.em}>Row Level Security (RLS)</strong> su Supabase: isolamento tecnico dei dati tra studi diversi — ogni Studio accede esclusivamente ai propri dati.</li>
            <li style={s.li}>Autenticazione tramite token <strong style={s.em}>JWT</strong> con scadenza breve e refresh token rotante.</li>
            <li style={s.li}>Backup del database con frequenza e retention gestiti dall&apos;infrastruttura Supabase.</li>
            <li style={s.li}>Monitoraggio degli accessi e log di sicurezza, conservati per un massimo di 12 mesi.</li>
          </ul>

          <h3 style={s.h3}>Misure organizzative</h3>
          <ul style={s.ul}>
            <li style={s.li}>Accesso ai sistemi di produzione limitato al minimo indispensabile (principio del minimo privilegio).</li>
            <li style={s.li}>Aggiornamento periodico delle dipendenze software per la correzione di vulnerabilità di sicurezza.</li>
            <li style={s.li}>Utilizzo di variabili di ambiente per la gestione delle credenziali; nessuna credenziale sensibile nel codice sorgente.</li>
            <li style={s.li}>Procedure documentate per la risposta agli incidenti di sicurezza.</li>
          </ul>

          <h2 style={s.h2}>Art. 7 — Notifica delle violazioni dei dati</h2>
          <p style={s.p}>
            In caso di violazione dei dati personali (data breach) ai sensi dell&apos;art. 4(12) GDPR, il FORNITORE notifica
            il CLIENTE senza ingiustificato ritardo e, ove possibile, entro 36 ore dalla scoperta, tramite email all&apos;indirizzo
            comunicato dal CLIENTE in fase di registrazione.
          </p>
          <p style={s.p}>La notifica conterrà almeno:</p>
          <ul style={s.ul}>
            <li style={s.li}>La natura della violazione, incluse le categorie e il numero approssimativo di interessati e di registrazioni coinvolte.</li>
            <li style={s.li}>Il nome e i dati di contatto del punto di riferimento per informazioni.</li>
            <li style={s.li}>Le probabili conseguenze della violazione.</li>
            <li style={s.li}>Le misure adottate o proposte per porre rimedio alla violazione, incluse, se del caso, le misure per attenuarne i possibili effetti negativi.</li>
          </ul>
          <p style={s.p}>
            Resta inteso che il CLIENTE è il solo responsabile della valutazione della necessità di notifica al Garante (art. 33 GDPR)
            e agli interessati (art. 34 GDPR) sulla base delle informazioni fornite dal FORNITORE.
          </p>

          <h2 style={s.h2}>Art. 8 — Audit e ispezioni</h2>
          <p style={s.p}>
            Il FORNITORE mette a disposizione del CLIENTE tutte le informazioni necessarie a dimostrare il rispetto degli obblighi
            di cui all&apos;art. 28 GDPR. Il CLIENTE può richiedere un audit delle attività di trattamento del FORNITORE con preavviso
            scritto di almeno 14 giorni, in modalità da concordare tra le Parti, senza interferire con l&apos;operatività del Servizio.
            Le spese dell&apos;audit sono a carico del CLIENTE, salvo accordi diversi.
          </p>

          <h2 style={s.h2}>Art. 9 — Restituzione e cancellazione dei dati</h2>
          <p style={s.p}>
            Alla cessazione del contratto, per qualsiasi causa:
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Il CLIENTE dispone di 30 giorni per esportare i propri dati tramite le funzionalità di esportazione del Servizio.</li>
            <li style={s.li}>Trascorso tale termine, il FORNITORE procederà alla cancellazione definitiva di tutti i dati personali del CLIENTE dall&apos;infrastruttura attiva.</li>
            <li style={s.li}>I backup automatici vengono eliminati secondo i cicli di retention dell&apos;infrastruttura Supabase (massimo 30 giorni aggiuntivi).</li>
            <li style={s.li}>Su richiesta scritta del CLIENTE, il FORNITORE fornirà attestazione dell&apos;avvenuta cancellazione.</li>
          </ul>
          <p style={s.p}>
            Fanno eccezione i dati che il FORNITORE è obbligato a conservare per legge (es. dati di fatturazione per 10 anni).
          </p>

          <h2 style={s.h2}>Art. 10 — Trasferimenti internazionali</h2>
          <p style={s.p}>
            Tutti i trasferimenti di dati verso paesi terzi (USA) avvengono con le garanzie appropriate ai sensi del Capo V
            GDPR (artt. 44-49), in particolare tramite le Standard Contractual Clauses (SCC) adottate dalla Commissione Europea
            con decisione 2021/914. Su richiesta, il FORNITORE può fornire copia delle garanzie adottate.
          </p>

          <h2 style={s.h2}>Art. 11 — Modifiche al DPA</h2>
          <p style={s.p}>
            Il FORNITORE si riserva il diritto di modificare il presente DPA per adeguarlo a variazioni normative o tecnologiche,
            comunicando le modifiche al CLIENTE con almeno 15 giorni di preavviso via email. Il proseguimento dell&apos;utilizzo del
            Servizio dopo la notifica costituisce accettazione delle modifiche.
          </p>

          <h2 style={s.h2}>Art. 12 — Legge applicabile e foro competente</h2>
          <p style={s.p}>
            Il presente DPA è regolato dalla legge italiana. Per qualsiasi controversia derivante dall&apos;interpretazione, validità
            o esecuzione del presente Accordo, le Parti concordano la competenza esclusiva del Foro di Milano.
          </p>

          <h2 style={s.h2}>Contatti</h2>
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
