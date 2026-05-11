/*
  # Fix data_source CHECK constraint

  The campaign_inputs.data_source column CHECK constraint did not include
  'vif_xb_intelligence', which is the value sent by the wizard when the user
  selects the VIF XB Intelligence data source. This caused the campaign_inputs
  INSERT (and subsequently the simulation_results INSERT) to fail silently,
  leaving campaigns with status 'simulated' but no inputs or results rows.

  Changes:
  - Drop the existing CHECK constraint on campaign_inputs.data_source
  - Re-add it with 'vif_xb_intelligence' included in the allowed values
*/

ALTER TABLE campaign_inputs
  DROP CONSTRAINT IF EXISTS campaign_inputs_data_source_check;

ALTER TABLE campaign_inputs
  ADD CONSTRAINT campaign_inputs_data_source_check
  CHECK (data_source = ANY (ARRAY[
    'manual',
    'vif_xb',
    'vif_xb_intelligence',
    'vif_spend_stimulation',
    'csv_upload'
  ]));
