ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_left   text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_center text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_right  text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_font   text DEFAULT 'helvetica';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_header_name text;
ALTER TABLE report_cantiere ADD COLUMN IF NOT EXISTS header_snapshot jsonb;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_body_font_enabled boolean DEFAULT false;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_logo_size text DEFAULT 'medium';
