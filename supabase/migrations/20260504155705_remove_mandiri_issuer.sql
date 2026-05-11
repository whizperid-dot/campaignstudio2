/*
  # Remove Bank Mandiri issuer and all associated data

  Deletes all data belonging to Bank Mandiri (a1b2c3d4-e5f6-7890-abcd-ef1234567890):
  - simulation_results (via campaign IDs)
  - campaigns
  - vif_subscriptions
  - the issuer record itself

  Only Nusantara Bank remains.
*/

DELETE FROM simulation_results
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE issuer_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
);

DELETE FROM campaigns WHERE issuer_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

DELETE FROM vif_subscriptions WHERE issuer_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

DELETE FROM issuers WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
