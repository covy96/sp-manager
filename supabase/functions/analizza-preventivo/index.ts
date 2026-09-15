// supabase/functions/analizza-preventivo/index.ts
// Analizza un preventivo (PDF o Excel→testo) di un'impresa con Claude ed estrae
// in modo strutturato: fornitore, categoria, importo totale, data e righe.
// È solo una PROPOSTA: l'app mostra il risultato, l'utente lo rivede e poi crea
// la voce CAPEX. Salva l'esito in capex_analisi (scoping per studio già garantito
// dalla verifica manuale qui + RLS lato client).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
// Modello configurabile via secret. Default: qualità massima sui documenti.
// Per ridurre i costi si può impostare ANTHROPIC_MODEL=claude-sonnet-5.
const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-5';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ── Categorie CAPEX suggerite (allineate a CapexPanel) ────────────────
const CATEGORIE = [
  'Edile', 'Elettricista', 'Idraulico', 'Illuminotecnica', 'Falegnameria',
  'Serramenti', 'Cucina', 'Pittura', 'Arredo', 'Altro',
];

const SYSTEM = `Sei un assistente che analizza i PREVENTIVI (offerte economiche) che le imprese e i fornitori inviano a uno studio di progettazione per i lavori di un cantiere.
Il tuo compito è estrarre i dati in modo fedele e conservativo: NON inventare valori. Se un dato non è presente o non è certo, restituisci null.
Regole:
- fornitore: la ragione sociale dell'impresa/fornitore che ha emesso il preventivo (non il destinatario/committente).
- categoria: scegli la più adatta tra ${CATEGORIE.join(', ')}. Se nessuna calza, usa "Altro".
- importo_totale: il TOTALE complessivo dell'offerta in euro. Se il documento distingue imponibile e totale con IVA, usa l'IMPONIBILE (IVA esclusa) e segnalalo in note; se non è distinguibile, usa il totale che trovi e indicalo in note.
- data_preventivo: la data del preventivo in formato YYYY-MM-DD, altrimenti null.
- righe: le voci/lavorazioni del preventivo con le loro quantità e importi, se elencate. Se il documento non ha un dettaglio righe, restituisci un array vuoto.
- confidence: "alta" se i dati chiave (fornitore e importo) sono chiari; "media" se hai dovuto interpretare; "bassa" se il documento è ambiguo o poco leggibile.
Devi SEMPRE rispondere invocando lo strumento estrai_preventivo.`;

const ISTRUZIONE = 'Analizza questo preventivo ed estrai i dati richiesti con lo strumento estrai_preventivo.';

const TOOL = {
  name: 'estrai_preventivo',
  description: 'Registra i dati estratti dal preventivo dell\'impresa/fornitore.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      fornitore: { type: ['string', 'null'], description: 'Ragione sociale dell\'impresa/fornitore che emette il preventivo.' },
      categoria: { type: 'string', description: `Categoria di lavoro. Preferisci una tra: ${CATEGORIE.join(', ')}.` },
      data_preventivo: { type: ['string', 'null'], description: 'Data del preventivo in formato YYYY-MM-DD, oppure null.' },
      importo_totale: { type: ['number', 'null'], description: 'Totale dell\'offerta in euro (numero, senza simboli).' },
      valuta: { type: 'string', description: 'Codice valuta, es. EUR.' },
      confidence: { type: 'string', enum: ['alta', 'media', 'bassa'], description: 'Affidabilità dell\'estrazione.' },
      righe: {
        type: 'array',
        description: 'Voci/lavorazioni del preventivo, se elencate.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            descrizione: { type: 'string' },
            quantita: { type: ['number', 'null'] },
            unita: { type: ['string', 'null'] },
            prezzo_unitario: { type: ['number', 'null'] },
            importo: { type: ['number', 'null'] },
          },
          required: ['descrizione', 'quantita', 'unita', 'prezzo_unitario', 'importo'],
        },
      },
      note: { type: ['string', 'null'], description: 'Eventuali note utili (es. "importo IVA esclusa").' },
    },
    required: ['fornitore', 'categoria', 'data_preventivo', 'importo_totale', 'valuta', 'confidence', 'righe', 'note'],
  },
};

// Coercizioni difensive: il modello può restituire numeri come stringa ("1.234,56").
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function toDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY non configurata sul progetto Supabase.' }, 500);

    const { projectId, fileKind, fileName, content, storagePath } = await req.json();
    if (!projectId) return json({ error: 'projectId mancante' }, 400);
    if (!content)   return json({ error: 'Contenuto del file mancante' }, 400);
    if (fileKind !== 'pdf' && fileKind !== 'xlsx') return json({ error: 'Tipo file non supportato (solo pdf o xlsx)' }, 400);

    // ── Autenticazione ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Non autenticato' }, 401);
    const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return json({ error: 'Sessione non valida' }, 401);

    // ── Verifica che l'utente appartenga allo studio del progetto ───
    const { data: proj, error: pErr } = await admin
      .from('projects')
      .select('id, studio')
      .eq('id', projectId)
      .single();
    if (pErr || !proj) return json({ error: 'Progetto non trovato' }, 404);
    const { data: tm } = await admin
      .from('team_members')
      .select('id')
      .eq('user_account', user.id)
      .eq('studio', proj.studio)
      .maybeSingle();
    if (!tm) return json({ error: 'Non autorizzato su questo progetto.' }, 403);

    // ── Costruzione messaggio per Claude ────────────────────────────
    const userContent = fileKind === 'pdf'
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content } },
          { type: 'text', text: ISTRUZIONE },
        ]
      : [
          { type: 'text', text: `Contenuto del preventivo (file Excel convertito in testo, un blocco per foglio):\n\n${content}\n\n${ISTRUZIONE}` },
        ];

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'disabled' },
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'estrai_preventivo' },
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('Anthropic error:', aiRes.status, errText);
      return json({ error: `Errore analisi AI (${aiRes.status}): ${errText.slice(0, 300)}` }, 502);
    }
    const aiData = await aiRes.json();
    const toolUse = (aiData.content || []).find((b: any) => b.type === 'tool_use' && b.name === 'estrai_preventivo');
    if (!toolUse) {
      console.error('Nessun tool_use nella risposta:', JSON.stringify(aiData).slice(0, 500));
      return json({ error: 'Il modello non ha restituito dati strutturati.' }, 502);
    }
    const out = toolUse.input || {};

    const righe = Array.isArray(out.righe) ? out.righe.map((r: any) => ({
      descrizione: String(r?.descrizione ?? '').trim(),
      quantita: toNum(r?.quantita),
      unita: r?.unita ? String(r.unita).trim() : null,
      prezzo_unitario: toNum(r?.prezzo_unitario),
      importo: toNum(r?.importo),
    })) : [];

    // ── Persistenza in capex_analisi (admin: auth già verificata) ────
    const row = {
      project_id: projectId,
      file_name: fileName || null,
      file_kind: fileKind,
      storage_path: storagePath || null,
      stato: 'completato',
      fornitore: out.fornitore ? String(out.fornitore).trim() : null,
      categoria: out.categoria ? String(out.categoria).trim() : 'Altro',
      data_preventivo: toDate(out.data_preventivo),
      importo_totale: toNum(out.importo_totale),
      valuta: out.valuta ? String(out.valuta).trim() : 'EUR',
      confidence: ['alta', 'media', 'bassa'].includes(out.confidence) ? out.confidence : null,
      righe,
      raw: out,
      created_by: user.id,
    };
    const { data: analisi, error: insErr } = await admin
      .from('capex_analisi')
      .insert(row)
      .select('*')
      .single();
    if (insErr) return json({ error: 'Errore salvataggio analisi: ' + insErr.message }, 500);

    return json({ analisi });
  } catch (err) {
    console.error('analizza-preventivo error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
