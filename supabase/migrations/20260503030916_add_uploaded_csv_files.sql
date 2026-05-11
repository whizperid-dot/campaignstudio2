/*
  # Add uploaded_csv_files table

  ## Purpose
  Stores metadata about CSV segment files uploaded by issuers for campaign targeting.
  The actual file content is stored in Supabase Storage; this table tracks metadata
  and parsed column summary so the UI can list previously uploaded files.

  ## New Tables
  - `uploaded_csv_files`
    - `id` (uuid, pk)
    - `issuer_id` (uuid, fk → issuers.id)
    - `filename` (text) — original uploaded filename
    - `row_count` (int) — number of data rows detected
    - `columns` (text[]) — column names detected in the file
    - `has_consent_flag` (bool) — whether consent_flag column was detected
    - `has_card_status` (bool) — whether card_status column was detected
    - `storage_path` (text) — path in Supabase Storage bucket
    - `uploaded_at` (timestamptz)

  ## Security
  - RLS enabled; issuers can only see/insert their own files
*/

CREATE TABLE IF NOT EXISTS uploaded_csv_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id       uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  filename        text NOT NULL DEFAULT '',
  row_count       int NOT NULL DEFAULT 0,
  columns         text[] NOT NULL DEFAULT '{}',
  has_consent_flag boolean NOT NULL DEFAULT false,
  has_card_status  boolean NOT NULL DEFAULT false,
  storage_path    text NOT NULL DEFAULT '',
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE uploaded_csv_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuers can view own csv files"
  ON uploaded_csv_files FOR SELECT
  TO authenticated
  USING (issuer_id = (SELECT id FROM issuers WHERE email = auth.jwt()->>'email' LIMIT 1));

CREATE POLICY "Issuers can insert own csv files"
  ON uploaded_csv_files FOR INSERT
  TO authenticated
  WITH CHECK (issuer_id = (SELECT id FROM issuers WHERE email = auth.jwt()->>'email' LIMIT 1));
