ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_left   text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_center text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_right  text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_footer_font   text DEFAULT 'helvetica';
