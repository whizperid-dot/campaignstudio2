/*
  # Add match summary columns to uploaded_csv_files

  ## Changes to uploaded_csv_files
  - `matched_count` (int) — number of card hashes that matched the VIF dataset
  - `unmatched_count` (int) — number of card hashes that did not match
  - `match_pct` (numeric 5,2) — percentage of matched cards
  - `unmatched_hashes` (text[]) — the actual unmatched hash values for inspection
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploaded_csv_files' AND column_name='matched_count') THEN
    ALTER TABLE uploaded_csv_files ADD COLUMN matched_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploaded_csv_files' AND column_name='unmatched_count') THEN
    ALTER TABLE uploaded_csv_files ADD COLUMN unmatched_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploaded_csv_files' AND column_name='match_pct') THEN
    ALTER TABLE uploaded_csv_files ADD COLUMN match_pct numeric(5,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uploaded_csv_files' AND column_name='unmatched_hashes') THEN
    ALTER TABLE uploaded_csv_files ADD COLUMN unmatched_hashes text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
