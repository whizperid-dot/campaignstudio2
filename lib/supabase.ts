import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Issuer = {
  id: string;
  name: string;
  tier: number;
  country: string;
  email: string;
  created_at: string;
  portfolio?: 'Credit' | 'Debit';
};

export type VifSubscription = {
  id: string;
  issuer_id: string;
  package_name: string;
  is_active: boolean;
  subscribed_at: string;
};

export type Campaign = {
  id: string;
  issuer_id: string;
  name: string;
  description: string;
  status: 'draft' | 'simulated' | 'launched' | 'completed';
  created_at: string;
  updated_at: string;
  launched_at: string | null;
};

export type CampaignInputs = {
  id: string;
  campaign_id: string;
  data_source: 'manual' | 'vif_xb' | 'vif_spend_stimulation' | 'csv_upload';
  segment_data: Record<string, unknown>;
  mechanics_config: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  updated_at: string;
};

export type SimulationResult = {
  id: string;
  campaign_id: string;
  projected_budget: number;
  projected_uplift_pct: number;
  projected_roi: number;
  projected_activated_cardholders: number;
  cost_per_cardholder: number;
  sensitivity_data: Record<string, unknown>;
  ai_recommendations: AiRecommendation[];
  simulated_at: string;
};

export type AiRecommendation = {
  type: 'optimization' | 'warning' | 'benchmark' | 'suggestion';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
};

export type UploadedCsvFile = {
  id: string;
  issuer_id: string;
  filename: string;
  row_count: number;
  columns: string[];
  has_consent_flag: boolean;
  has_card_status: boolean;
  storage_path: string;
  uploaded_at: string;
  matched_count: number;
  unmatched_count: number;
  match_pct: number;
  unmatched_hashes: string[];
};

export type ActualResult = {
  id: string;
  campaign_id: string;
  actual_budget_spent: number;
  actual_uplift_pct: number;
  actual_roi: number;
  actual_activated_cardholders: number;
  notes: string;
  recorded_at: string;
};
