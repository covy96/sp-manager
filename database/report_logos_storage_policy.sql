-- Policy storage per bucket report-logos
-- Eseguire su Supabase SQL Editor

-- Permette upload agli utenti autenticati
CREATE POLICY "report_logos_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-logos');

-- Permette update (upsert) agli utenti autenticati
CREATE POLICY "report_logos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'report-logos');

-- Lettura pubblica (il bucket è già pubblico, ma esplicitiamo)
CREATE POLICY "report_logos_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-logos');
