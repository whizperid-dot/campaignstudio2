/*
  # Seed VIF subscriptions for Nusantara Bank

  Nusantara Bank (issuer_id: 21e60033-7ad2-4237-aa30-8143ca7c0951) had no
  vif_subscriptions rows, causing the VIF Subscriptions page to show all
  packages as "Not subscribed" even though the campaign wizard hardcodes
  "1 active subscription" for VIF XB.

  This inserts the same default subscription set as Bank Mandiri:
  - VIF XB: active
  - VIF Spend Stimulation: inactive
  - VIF Retention: inactive
  - VIF Fraud & Authorization: inactive
  - VIF Acquisition: inactive
*/

INSERT INTO vif_subscriptions (issuer_id, package_name, is_active)
VALUES
  ('21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF XB',                   true),
  ('21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Spend Stimulation',     false),
  ('21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Retention',             false),
  ('21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Fraud & Authorization', false),
  ('21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Acquisition',           false)
ON CONFLICT DO NOTHING;
