import { supabase } from '../lib/supabase';

export async function backfillContacts(studioId) {
  const [{ data: projects }, { data: commesse }] = await Promise.all([
    supabase.from('projects').select('client').eq('studio', studioId).eq('archived', false),
    supabase.from('commesse').select('cliente').eq('studio', studioId),
  ]);

  const { data: existing } = await supabase.from('global_contacts').select('full_name').eq('studio', studioId);
  const existingNames = new Set((existing || []).map(c => c.full_name.toLowerCase()));

  const toInsert = [];
  const seen = new Set();

  [...(projects || []).map(p => p.client), ...(commesse || []).map(c => c.cliente)]
    .filter(Boolean)
    .forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingNames.has(key) && !seen.has(key)) {
        seen.add(key);
        toInsert.push({ full_name: name.trim(), studio: studioId, company: '' });
      }
    });

  if (toInsert.length > 0) {
    await supabase.from('global_contacts').insert(toInsert);
  }
  return toInsert.length;
}
