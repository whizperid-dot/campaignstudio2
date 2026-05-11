
/*
  # Campaign Decisioning Studio — Initial Schema

  1. New Tables
    - `issuers` — bank/issuer accounts with login credentials
    - `vif_subscriptions` — which VIF data packages each issuer subscribes to
    - `campaigns` — campaign records per issuer
    - `campaign_inputs` — segment, mechanics, and assumption data per campaign
    - `simulation_results` — projected financial metrics and AI recommendations
    - `actual_results` — post-campaign actual performance data

  2. Security
    - RLS enabled on all tables
    - Issuers: authenticated users can only view/update their own record
    - Anon login lookup policy on issuers for the custom auth flow
    - All other tables: open to anon/authenticated (demo app pattern)

  3. Indexes
    - campaigns.issuer_id, campaign_inputs.campaign_id, simulation_results.campaign_id, vif_subscriptions.issuer_id
*/

CREATE TABLE IF NOT EXISTS issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier integer NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  country text NOT NULL DEFAULT 'Indonesia',
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS vif_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  package_name text NOT NULL CHECK (package_name IN ('VIF XB','VIF Spend Stimulation','VIF Retention','VIF Fraud & Authorization','VIF Acquisition')),
  is_active boolean NOT NULL DEFAULT false,
  subscribed_at timestamptz DEFAULT now(),
  UNIQUE(issuer_id, package_name)
);
ALTER TABLE vif_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','simulated','launched','completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  launched_at timestamptz
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS campaign_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  data_source text NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual','vif_xb','vif_spend_stimulation','csv_upload')),
  segment_data jsonb NOT NULL DEFAULT '{}',
  mechanics_config jsonb NOT NULL DEFAULT '{}',
  assumptions jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id)
);
ALTER TABLE campaign_inputs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  projected_budget numeric(18,2) DEFAULT 0,
  projected_uplift_pct numeric(8,4) DEFAULT 0,
  projected_roi numeric(8,4) DEFAULT 0,
  projected_activated_cardholders integer DEFAULT 0,
  cost_per_cardholder numeric(18,2) DEFAULT 0,
  sensitivity_data jsonb NOT NULL DEFAULT '{}',
  ai_recommendations jsonb NOT NULL DEFAULT '[]',
  simulated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id)
);
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS actual_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  actual_budget_spent numeric(18,2) DEFAULT 0,
  actual_uplift_pct numeric(8,4) DEFAULT 0,
  actual_roi numeric(8,4) DEFAULT 0,
  actual_activated_cardholders integer DEFAULT 0,
  notes text DEFAULT '',
  recorded_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id)
);
ALTER TABLE actual_results ENABLE ROW LEVEL SECURITY;

-- Issuers: authenticated users can read/update their own record
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='issuers' AND policyname='Issuers can view own data') THEN
    CREATE POLICY "Issuers can view own data" ON issuers FOR SELECT TO authenticated USING (auth.uid()::text = id::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='issuers' AND policyname='Issuers can update own data') THEN
    CREATE POLICY "Issuers can update own data" ON issuers FOR UPDATE TO authenticated USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='issuers' AND policyname='Issuers: anon can lookup for login') THEN
    CREATE POLICY "Issuers: anon can lookup for login" ON issuers FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- VIF subscriptions: open read/write for demo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vif_subscriptions' AND policyname='VIF subscriptions select') THEN
    CREATE POLICY "VIF subscriptions select" ON vif_subscriptions FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Campaigns: open read/write for demo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='Campaigns select') THEN
    CREATE POLICY "Campaigns select" ON campaigns FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='Campaigns insert') THEN
    CREATE POLICY "Campaigns insert" ON campaigns FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='Campaigns update') THEN
    CREATE POLICY "Campaigns update" ON campaigns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Campaign inputs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaign_inputs' AND policyname='Campaign inputs select') THEN
    CREATE POLICY "Campaign inputs select" ON campaign_inputs FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaign_inputs' AND policyname='Campaign inputs insert') THEN
    CREATE POLICY "Campaign inputs insert" ON campaign_inputs FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaign_inputs' AND policyname='Campaign inputs update') THEN
    CREATE POLICY "Campaign inputs update" ON campaign_inputs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Simulation results
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulation_results' AND policyname='Simulation results select') THEN
    CREATE POLICY "Simulation results select" ON simulation_results FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulation_results' AND policyname='Simulation results insert') THEN
    CREATE POLICY "Simulation results insert" ON simulation_results FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulation_results' AND policyname='Simulation results update') THEN
    CREATE POLICY "Simulation results update" ON simulation_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Actual results
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='actual_results' AND policyname='Actual results select') THEN
    CREATE POLICY "Actual results select" ON actual_results FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='actual_results' AND policyname='Actual results insert') THEN
    CREATE POLICY "Actual results insert" ON actual_results FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_issuer_id ON campaigns(issuer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_inputs_campaign_id ON campaign_inputs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_campaign_id ON simulation_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_vif_subscriptions_issuer_id ON vif_subscriptions(issuer_id);
