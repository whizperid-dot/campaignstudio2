/*
  # Add Nusantara Bank issuer

  1. Changes
    - Insert a new issuer row for "Nusantara Bank" with email hardi@nusantarabank.co.id
      and password visanusantara
*/

INSERT INTO issuers (id, name, tier, country, email, password_hash)
VALUES (
  gen_random_uuid(),
  'Nusantara Bank',
  2,
  'Indonesia',
  'hardi@nusantarabank.co.id',
  'visanusantara'
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash;
