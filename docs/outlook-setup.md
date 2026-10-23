# Collegamento Outlook (Microsoft Graph)

ASM legge la casella Outlook dell'utente in **sola lettura** tramite Microsoft Graph.
Tutto gratuito: Graph è incluso nella licenza Microsoft 365, la registrazione
dell'app su Microsoft Entra ID non costa nulla e la edge function rientra nel
piano gratuito di Supabase.

## 1. Registrazione dell'app su Microsoft Entra ID

1. Vai su https://entra.microsoft.com con l'account amministratore del dominio dello studio.
2. **Identità → Applicazioni → Registrazioni app → Nuova registrazione**.
   - Nome: `ASM`
   - Tipi di account supportati: **Solo account in questa directory organizzativa (tenant singolo)**
   - URI di reindirizzamento: piattaforma **Web**, valore
     `https://<ID-PROGETTO-SUPABASE>.supabase.co/functions/v1/outlook`
3. Nella pagina **Panoramica** copia **ID applicazione (client)** e **ID directory (tenant)**.
4. **Certificati e segreti → Nuovo segreto client** (scadenza 24 mesi) e copia subito il **Valore**
   (non l'ID segreto: il valore si vede una volta sola).
5. **Autorizzazioni API → Aggiungi un'autorizzazione → Microsoft Graph → Autorizzazioni delegate**:
   `Mail.Read`, `User.Read`, `offline_access`, `openid`, `profile`, `email`.
   Poi **Concedi consenso amministratore per <studio>**.

## 2. Database

Esegui `database/outlook_connections.sql` nel SQL Editor di Supabase.

## 3. Secret della edge function

Supabase → Edge Functions → Secrets (o `supabase secrets set …`):

| Nome | Valore |
|---|---|
| `MS_CLIENT_ID` | ID applicazione (client) |
| `MS_CLIENT_SECRET` | Valore del segreto client |
| `MS_TENANT` | ID directory (tenant) |
| `OUTLOOK_TOKEN_KEY` | stringa casuale lunga, es. `openssl rand -base64 32` (cifra i token; se la cambi, va ricollegato Outlook) |

## 4. Deploy

```
supabase functions deploy outlook --no-verify-jwt
```

`--no-verify-jwt` serve perché Microsoft richiama la funzione al ritorno dal login
senza il token Supabase: la funzione verifica da sola l'utente (JWT per le chiamate
dall'app, state firmato per il ritorno da Microsoft).

## 5. Lettura automatica

1. Esegui `database/outlook_auto_sync.sql` nel SQL Editor.
2. Verifica che il secret `CRON_SECRET` esista (è lo stesso usato da check-scadenze).
3. Esegui `supabase/setup-cron-outlook.sql` sostituendo `CAMBIA_QUESTA_STRINGA` con il valore di `CRON_SECRET`.
4. In ASM → Posta Outlook attiva **Lettura automatica**.

Regole (gratuite, nessuna AI): una mail è abbinata a un progetto se il nome del
progetto è nell'oggetto (vince sugli altri criteri), se il mittente o un destinatario
è un contatto del progetto in Anagrafica, o se nel testo ci sono indirizzo e cliente.
Se il progetto è sicuro e nel testo c'è un appuntamento con data E ora, l'attività
viene creata in calendario; se manca uno
dei due la mail va in "Da rivedere" (o "Collegate" se c'è solo il progetto).

Se modifichi `src/lib/mailDates.js` o `src/lib/mailMatch.js`, rigenera la copia
dentro la funzione con `node scripts/inline-outlook-shared.mjs` e ripubblicala.

## 6. Uso

Impostazioni → **Posta Outlook** → **Collega Outlook**. Da una mail aperta,
**Metti a calendario** crea un'attività nel Calendario ASM con le date e gli orari
trovati nel testo.

Il segreto client scade dopo 24 mesi: prima della scadenza creane uno nuovo e
aggiorna `MS_CLIENT_SECRET`.
