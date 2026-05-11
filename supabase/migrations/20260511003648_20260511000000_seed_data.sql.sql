/*
  # Seed Data Migration

  This migration seeds the database with the initial production data so that
  the project can be fully restored from scratch using only the repository.

  ## What this seeds

  1. Issuers
     - Nusantara Bank (Tier 2, Indonesia) — the primary issuer account

  2. VIF Subscriptions (5 rows)
     - VIF XB (active)
     - VIF Spend Stimulation, VIF Retention, VIF Fraud & Authorization, VIF Acquisition (inactive)

  3. Campaigns (2 rows) with their campaign_inputs and simulation_results
     - "Test" (status: completed) — XB Intelligence campaign with full simulation data
     - "Travel Campaign" (status: simulated) — XB Intelligence campaign with full simulation data

  ## Notes
  - All inserts use ON CONFLICT DO NOTHING so this migration is safe to run multiple times
  - UUIDs are fixed so foreign key relationships are preserved across environments
  - password_hash stores the plain-text login password as used by the application auth layer
*/

-- ============================================================
-- 1. Issuer: Nusantara Bank
-- ============================================================
INSERT INTO issuers (id, name, tier, country, email, password_hash)
VALUES (
  '21e60033-7ad2-4237-aa30-8143ca7c0951',
  'Nusantara Bank',
  2,
  'Indonesia',
  'hardi@nusantarabank.co.id',
  'visanusantara'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. VIF Subscriptions
-- ============================================================
INSERT INTO vif_subscriptions (id, issuer_id, package_name, is_active)
VALUES
  ('c28e8c20-ae56-4acf-bd00-ceb346a84a30', '21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF XB',                    true),
  ('a8bc0273-e1df-48a5-b159-e9da88d2f97a', '21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Spend Stimulation',     false),
  ('05ce8560-78e6-4aa4-9f5f-a1ea146a4170', '21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Retention',             false),
  ('4ce96241-84f8-4ec4-a490-ac2f104034e9', '21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Fraud & Authorization', false),
  ('4c5b23aa-fdeb-4699-a4bf-873ec699d976', '21e60033-7ad2-4237-aa30-8143ca7c0951', 'VIF Acquisition',           false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Campaign: Test (completed)
-- ============================================================
INSERT INTO campaigns (id, issuer_id, name, description, status, created_at, launched_at)
VALUES (
  '9ef41531-1279-4229-805d-801a6a43c5a2',
  '21e60033-7ad2-4237-aa30-8143ca7c0951',
  'Test',
  'Test',
  'completed',
  '2026-05-03 11:42:19.783912+00',
  '2026-05-03 11:43:38.471+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaign_inputs (campaign_id, data_source, segment_data, mechanics_config, assumptions)
VALUES (
  '9ef41531-1279-4229-805d-801a6a43c5a2',
  'vif_xb_intelligence',
  '{"slices":[{"id":"n9o8n42","label":"Mass Affluent × D6–D8","avg_yoy":17.4,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12200000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Mass Affluent","dim2_value":"D6–D8","segment_type":"cross_border","take_up_rate":15,"top_corridor":"NLD","audience_size":4777,"avg_monthly_spend":14333896,"control_group_pct":15,"avg_spend_per_trip":10164678,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"hwwrbqw","label":"Mass Affluent × D9–D10","avg_yoy":16.7,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Mass Affluent","dim2_value":"D9–D10","segment_type":"cross_border","take_up_rate":15,"top_corridor":"NLD","audience_size":3998,"avg_monthly_spend":14289673,"control_group_pct":15,"avg_spend_per_trip":10233392,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"clilth3","label":"Emerging Affluent × D6–D8","avg_yoy":18.1,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12600000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Emerging Affluent","dim2_value":"D6–D8","segment_type":"cross_border","take_up_rate":15,"top_corridor":"MYS","audience_size":3876,"avg_monthly_spend":14541723,"control_group_pct":15,"avg_spend_per_trip":10493147,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"kl1ik45","label":"Emerging Affluent × D9–D10","avg_yoy":17.2,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":11700000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Emerging Affluent","dim2_value":"D9–D10","segment_type":"cross_border","take_up_rate":15,"top_corridor":"SGP","audience_size":3122,"avg_monthly_spend":14136105,"control_group_pct":15,"avg_spend_per_trip":9725510,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"3nuu7ql","label":"Established Affluent × D6–D8","avg_yoy":17.3,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12000000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Established Affluent","dim2_value":"D6–D8","segment_type":"cross_border","take_up_rate":15,"top_corridor":"AUS","audience_size":2421,"avg_monthly_spend":14296559,"control_group_pct":15,"avg_spend_per_trip":9920666,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"8vnbhta","label":"Established Affluent × D9–D10","avg_yoy":17.1,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12600000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Established Affluent","dim2_value":"D9–D10","segment_type":"cross_border","take_up_rate":15,"top_corridor":"MYS","audience_size":2001,"avg_monthly_spend":14687646,"control_group_pct":15,"avg_spend_per_trip":10438858,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"qtn66uc","label":"High Net Worth × D6–D8","avg_yoy":17.3,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"High Net Worth","dim2_value":"D6–D8","segment_type":"cross_border","take_up_rate":15,"top_corridor":"THA","audience_size":1411,"avg_monthly_spend":14183941,"control_group_pct":15,"avg_spend_per_trip":10226010,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"umk19at","label":"High Net Worth × D9–D10","avg_yoy":16.8,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12800000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"High Net Worth","dim2_value":"D9–D10","segment_type":"cross_border","take_up_rate":15,"top_corridor":"HKG","audience_size":1168,"avg_monthly_spend":15043584,"control_group_pct":15,"avg_spend_per_trip":10634571,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"14bucml","label":"Ultra High Net Worth × D6–D8","avg_yoy":16.6,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12700000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Ultra High Net Worth","dim2_value":"D6–D8","segment_type":"cross_border","take_up_rate":15,"top_corridor":"SGP","audience_size":532,"avg_monthly_spend":15513884,"control_group_pct":15,"avg_spend_per_trip":10519947,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"v449fn8","label":"Ultra High Net Worth × D9–D10","avg_yoy":16.2,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12400000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"Ultra High Net Worth","dim2_value":"D9–D10","segment_type":"cross_border","take_up_rate":15,"top_corridor":"HKG","audience_size":399,"avg_monthly_spend":15632337,"control_group_pct":15,"avg_spend_per_trip":10269642,"active_traveller_pct":100,"incremental_spend_lift":20}],"xb_stats":{"avg_yoy":17.3,"top_persona":"Aesthetics & Lifestyle Shopper","avg_xb_share":35.1,"top_corridor":"CHN","active_traveller_pct":100,"avg_travel_prob_active":65,"avg_travel_prob_inactive":27.4},"ch_filters":{"card_tiers":[],"dfmc_segments":["Top of Wallet","High Potential","Average Potential"],"travel_status":["Active Traveller"],"affluent_personas":["Ultra High Net Worth","High Net Worth","Established Affluent","Emerging Affluent","Mass Affluent"],"min_active_decile":6,"min_inactive_decile":1},"data_source":"vif_xb_intelligence","segment_name":"Mass Affluent × D6–D8","segment_type":"cross_border","audience_size":23705,"vif_segment_id":null,"avg_monthly_spend":14333896}',
  '{"reward_cap":null,"xb_min_trx":null,"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","duration_days":7,"travel_timing":"","slice_mechanics":[{"label":"Mass Affluent × D6–D8","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12200000,"target_corridors":[],"eligible_categories":[]},{"label":"Mass Affluent × D9–D10","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},{"label":"Emerging Affluent × D6–D8","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12600000,"target_corridors":[],"eligible_categories":[]},{"label":"Emerging Affluent × D9–D10","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":11700000,"target_corridors":[],"eligible_categories":[]},{"label":"Established Affluent × D6–D8","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12000000,"target_corridors":[],"eligible_categories":[]},{"label":"Established Affluent × D9–D10","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12600000,"target_corridors":[],"eligible_categories":[]},{"label":"High Net Worth × D6–D8","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},{"label":"High Net Worth × D9–D10","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12800000,"target_corridors":[],"eligible_categories":[]},{"label":"Ultra High Net Worth × D6–D8","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12700000,"target_corridors":[],"eligible_categories":[]},{"label":"Ultra High Net Worth × D9–D10","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12400000,"target_corridors":[],"eligible_categories":[]}],"spend_threshold":12200000,"target_corridors":[],"eligible_categories":[]}',
  '{"take_up_rate":50,"control_group_pct":15,"incremental_spend_lift":10,"avg_transactions_per_month":2}'
)
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO simulation_results (
  campaign_id, projected_budget, projected_uplift_pct, projected_roi,
  projected_activated_cardholders, cost_per_cardholder, sensitivity_data, ai_recommendations
)
VALUES (
  '9ef41531-1279-4229-805d-801a6a43c5a2',
  6145750000.00,
  8.4999,
  19.1377,
  10075,
  610000.00,
  '{"sensitivity":[{"roi":1091.9689881312627,"budget":614270000,"take_up_rate":5,"activated_cardholders":1007},{"roi":495.68872012316695,"budget":1229150000,"take_up_rate":10,"activated_cardholders":2015},{"roi":297.1915192085312,"budget":1843420000,"take_up_rate":15,"activated_cardholders":3022},{"roi":197.84436006158347,"budget":2458300000,"take_up_rate":20,"activated_cardholders":4030},{"roi":138.29914056942258,"budget":3072570000,"take_up_rate":25,"activated_cardholders":5037},{"roi":98.56290670772232,"budget":3687450000,"take_up_rate":30,"activated_cardholders":6045},{"roi":48.922180030791736,"budget":4916600000,"take_up_rate":40,"activated_cardholders":8060},{"roi":19.137744024633392,"budget":6145750000,"take_up_rate":50,"activated_cardholders":10075}],"incremental_revenue":7321907903.393907,"total_reward_payout":6145750000,"break_even_spend_lift":8.393645592225047,"break_even_take_up_rate":8.393645592225047,"uplift_per_cardholder_idr":363388.1534266667}',
  '[{"type":"optimization","title":"No Reward Cap Set — Budget at Risk","impact":"high","description":"Without a cap, each cardholder can earn up to IDR 610K. A cap of ~IDR 370K (60% of max) protects budget while preserving the incentive for most cardholders. Add a cap in the Mechanics step."},{"type":"suggestion","title":"Short Campaign Duration","impact":"medium","description":"XB campaigns under 14 days miss most travel planning windows. 60–90 days aligns with travel cycles and typically achieves 3–4× higher activation."},{"type":"optimization","title":"High Travel Probability — Add Corridor Targeting","impact":"medium","description":"65% of active travellers have high 3-month travel probability. Targeting the top corridor (CHN) with a corridor-specific offer typically improves conversion by 25–40%."},{"type":"optimization","title":"XB Cashback Without Cap — High Budget Exposure","impact":"high","description":"High-frequency XB travellers can quickly exhaust uncapped cashback budgets. A cap at 50–60% of the uncapped reward is industry standard for XB cashback programs."}]'
)
ON CONFLICT (campaign_id) DO NOTHING;

-- ============================================================
-- 4. Campaign: Travel Campaign (simulated)
-- ============================================================
INSERT INTO campaigns (id, issuer_id, name, description, status, created_at, launched_at)
VALUES (
  'af6670f4-e049-4614-a8e1-3e8ad36c6f81',
  '21e60033-7ad2-4237-aa30-8143ca7c0951',
  'Travel Campaign',
  'Test',
  'simulated',
  '2026-05-06 16:51:18.023465+00',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaign_inputs (campaign_id, data_source, segment_data, mechanics_config, assumptions)
VALUES (
  'af6670f4-e049-4614-a8e1-3e8ad36c6f81',
  'vif_xb_intelligence',
  '{"slices":[{"id":"clofbt0","label":"D1–D2 × Ultra High Net Worth","avg_yoy":18.2,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":9100000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D1–D2","dim2_value":"Ultra High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"AUS","audience_size":750,"avg_monthly_spend":1807992,"control_group_pct":15,"avg_spend_per_trip":7569328,"active_traveller_pct":0,"incremental_spend_lift":20},{"id":"ttnlrgi","label":"D3–D5 × High Net Worth","avg_yoy":16.9,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":9300000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D3–D5","dim2_value":"High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"KOR","audience_size":2908,"avg_monthly_spend":1803991,"control_group_pct":15,"avg_spend_per_trip":7731270,"active_traveller_pct":0,"incremental_spend_lift":20},{"id":"ev24ukv","label":"D3–D5 × Ultra High Net Worth","avg_yoy":17.9,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":8700000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D3–D5","dim2_value":"Ultra High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"HKG","audience_size":1096,"avg_monthly_spend":1763712,"control_group_pct":15,"avg_spend_per_trip":7249972,"active_traveller_pct":0,"incremental_spend_lift":20},{"id":"u86toq5","label":"D6–D8 × Ultra High Net Worth","avg_yoy":17.1,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D6–D8","dim2_value":"Ultra High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"SGP","audience_size":658,"avg_monthly_spend":15042535,"control_group_pct":15,"avg_spend_per_trip":10227387,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"72q0gpb","label":"D6–D8 × High Net Worth","avg_yoy":17.1,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12400000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D6–D8","dim2_value":"High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"ARE","audience_size":1758,"avg_monthly_spend":14248650,"control_group_pct":15,"avg_spend_per_trip":10303598,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"cif7ld8","label":"D9–D10 × Established Affluent","avg_yoy":17,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12700000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D9–D10","dim2_value":"Established Affluent","segment_type":"cross_border","take_up_rate":15,"top_corridor":"JPN","audience_size":2476,"avg_monthly_spend":14757656,"control_group_pct":15,"avg_spend_per_trip":10575924,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"pujbj2z","label":"D9–D10 × Emerging Affluent","avg_yoy":17.1,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":11900000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D9–D10","dim2_value":"Emerging Affluent","segment_type":"cross_border","take_up_rate":15,"top_corridor":"SGP","audience_size":3911,"avg_monthly_spend":14256167,"control_group_pct":15,"avg_spend_per_trip":9901292,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"h9qlw3u","label":"D9–D10 × High Net Worth","avg_yoy":16.8,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12500000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D9–D10","dim2_value":"High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"HKG","audience_size":1473,"avg_monthly_spend":14729604,"control_group_pct":15,"avg_spend_per_trip":10377864,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"v0d2sno","label":"D9–D10 × Ultra High Net Worth","avg_yoy":16.4,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":13100000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D9–D10","dim2_value":"Ultra High Net Worth","segment_type":"cross_border","take_up_rate":15,"top_corridor":"HKG","audience_size":490,"avg_monthly_spend":16165746,"control_group_pct":15,"avg_spend_per_trip":10915232,"active_traveller_pct":100,"incremental_spend_lift":20},{"id":"y3ruepz","label":"D6–D8 × Established Affluent","avg_yoy":17.4,"mechanics":{"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12200000,"target_corridors":[],"eligible_categories":[]},"dim1_value":"D6–D8","dim2_value":"Established Affluent","segment_type":"cross_border","take_up_rate":15,"top_corridor":"MYS","audience_size":3024,"avg_monthly_spend":14334243,"control_group_pct":15,"avg_spend_per_trip":10084260,"active_traveller_pct":100,"incremental_spend_lift":20}],"xb_stats":{"avg_yoy":17.5,"top_persona":"Aesthetics & Lifestyle Shopper","avg_xb_share":19.9,"top_corridor":"MYS","active_traveller_pct":39.6,"avg_travel_prob_active":39.3,"avg_travel_prob_inactive":19},"ch_filters":{},"data_source":"vif_xb_intelligence","segment_name":"D1–D2 × Ultra High Net Worth","segment_type":"cross_border","audience_size":18544,"vif_segment_id":null,"avg_monthly_spend":1807992}',
  '{"reward_cap":null,"xb_min_trx":null,"reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","duration_days":25,"travel_timing":"","slice_mechanics":[{"label":"D1–D2 × Ultra High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":9100000,"target_corridors":[],"eligible_categories":[]},{"label":"D3–D5 × High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":9300000,"target_corridors":[],"eligible_categories":[]},{"label":"D3–D5 × Ultra High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":8700000,"target_corridors":[],"eligible_categories":[]},{"label":"D6–D8 × Ultra High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12300000,"target_corridors":[],"eligible_categories":[]},{"label":"D6–D8 × High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12400000,"target_corridors":[],"eligible_categories":[]},{"label":"D9–D10 × Established Affluent","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12700000,"target_corridors":[],"eligible_categories":[]},{"label":"D9–D10 × Emerging Affluent","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":11900000,"target_corridors":[],"eligible_categories":[]},{"label":"D9–D10 × High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12500000,"target_corridors":[],"eligible_categories":[]},{"label":"D9–D10 × Ultra High Net Worth","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":13100000,"target_corridors":[],"eligible_categories":[]},{"label":"D6–D8 × Established Affluent","reward_type":"cashback","reward_value":5,"campaign_type":"spend_stimulation","spend_threshold":12200000,"target_corridors":[],"eligible_categories":[]}],"spend_threshold":9100000,"target_corridors":[],"eligible_categories":[]}',
  '{"take_up_rate":15,"control_group_pct":15,"incremental_spend_lift":20,"avg_transactions_per_month":4}'
)
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO simulation_results (
  campaign_id, projected_budget, projected_uplift_pct, projected_roi,
  projected_activated_cardholders, cost_per_cardholder, sensitivity_data, ai_recommendations
)
VALUES (
  'af6670f4-e049-4614-a8e1-3e8ad36c6f81',
  960505000.00,
  16.9996,
  437.7572,
  2111,
  455000.00,
  '{"sensitivity":[{"roi":1340.6159829028838,"budget":358540000,"take_up_rate":5,"activated_cardholders":788},{"roi":620.3079914514419,"budget":717080000,"take_up_rate":10,"activated_cardholders":1576},{"roi":380.2053276342946,"budget":1075620000,"take_up_rate":15,"activated_cardholders":2364},{"roi":260.15399572572096,"budget":1434160000,"take_up_rate":20,"activated_cardholders":3152},{"roi":188.05008742133276,"budget":1793155000,"take_up_rate":25,"activated_cardholders":3941},{"roi":140.05189142048476,"budget":2151695000,"take_up_rate":30,"activated_cardholders":4729},{"roi":80.04843687985289,"budget":2868775000,"take_up_rate":40,"activated_cardholders":6305},{"roi":44.04331868131867,"budget":3585855000,"take_up_rate":50,"activated_cardholders":7881}],"incremental_revenue":5165184545.099999,"total_reward_payout":960505000,"break_even_spend_lift":3.7191507548793865,"break_even_take_up_rate":3.7191507548793865,"uplift_per_cardholder_idr":327698.55}',
  '[{"type":"benchmark","title":"Healthy ROI Projection","impact":"medium","description":"A 438% ROI means every IDR of reward budget unlocks ~5.4× in incremental cardholder spend. This is a strong result for XB campaigns."},{"type":"optimization","title":"No Reward Cap Set — Budget at Risk","impact":"high","description":"Without a cap, each cardholder can earn up to IDR 455K. A cap of ~IDR 270K (60% of max) protects budget while preserving the incentive for most cardholders. Add a cap in the Mechanics step."},{"type":"optimization","title":"Spend Threshold May Be Too High","impact":"high","description":"Threshold IDR 9.1M is 503% of average monthly spend. Lowering to 80–100% of avg spend typically improves take-up by 40% and drives more genuine incremental spend."},{"type":"optimization","title":"XB Cashback Without Cap — High Budget Exposure","impact":"high","description":"High-frequency XB travellers can quickly exhaust uncapped cashback budgets. A cap at 50–60% of the uncapped reward is industry standard for XB cashback programs."}]'
)
ON CONFLICT (campaign_id) DO NOTHING;
