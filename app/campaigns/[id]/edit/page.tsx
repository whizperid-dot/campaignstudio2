'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import WizardProgress from '@/components/campaign/WizardProgress';
import Step1Details, { Step1Data, campaignDurationDays } from '@/components/campaign/Step1Details';
import Step2DataInput, { Step2Data } from '@/components/campaign/Step2DataInput';
import Step3AudienceMechanics, { Step3Data } from '@/components/campaign/Step3AudienceMechanics';
import Step4Assumptions, { Step4Data } from '@/components/campaign/Step4Assumptions';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { runSimulation } from '@/lib/simulation';
import { filterCardholders, computeSegmentStats } from '@/lib/cardholder-data';

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  const [step1, setStep1] = useState<Step1Data>({ name: '', description: '', start_date: '', end_date: '' });
  const [step2, setStep2] = useState<Step2Data>({ data_source: 'vif_spend_stimulation' });
  const [step3, setStep3] = useState<Step3Data>({
    segment_name: '',
    audience_size: 0,
    avg_monthly_spend: 0,
    segment_type: 'spend_stimulation',
    campaign_type: 'spend_stimulation',
    spend_threshold: 500000,
    reward_type: 'cashback',
    reward_value: 5,
    duration_days: 30,
    eligible_categories: [],
    slices: [],
  });
  const [step4, setStep4] = useState<Step4Data>({
    take_up_rate: 15,
    control_group_pct: 15,
    incremental_spend_lift: 20,
    avg_transactions_per_month: 4,
  });

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace('/login'); return; }
    loadCampaign();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadCampaign() {
    const { data } = await supabase
      .from('campaigns')
      .select('*, campaign_inputs(*)')
      .eq('id', id)
      .maybeSingle();

    if (!data) { router.replace('/campaigns'); return; }

    // Hydrate Step1
    setStep1({
      name: data.name ?? '',
      description: data.description ?? '',
      start_date: data.created_at ? data.created_at.slice(0, 10) : '',
      end_date: data.launched_at ? data.launched_at.slice(0, 10) : '',
    });

    const inputs = data.campaign_inputs as {
      data_source: string;
      segment_data: Record<string, unknown>;
      mechanics_config: Record<string, unknown>;
      assumptions: Record<string, unknown>;
    } | null;

    if (!inputs) { setLoadingCampaign(false); return; }

    const seg = inputs.segment_data ?? {};
    const mech = inputs.mechanics_config ?? {};
    const asmp = inputs.assumptions ?? {};

    // Hydrate Step2
    const ds = inputs.data_source as Step2Data['data_source'];
    setStep2({
      data_source: ds,
      ch_filters: (seg.ch_filters as Step2Data['ch_filters']) ?? undefined,
      csv_filename: seg.csv_filename as string | undefined,
      csv_file_id: seg.csv_file_id as string | undefined,
    });

    // Hydrate Step3
    const slices = Array.isArray(seg.slices) ? seg.slices as Step3Data['slices'] : [];
    setStep3({
      segment_name: String(seg.segment_name ?? ''),
      audience_size: Number(seg.audience_size ?? 0),
      avg_monthly_spend: Number(seg.avg_monthly_spend ?? 0),
      segment_type: String(seg.segment_type ?? 'spend_stimulation'),
      campaign_type: String(mech.campaign_type ?? 'spend_stimulation'),
      spend_threshold: Number(mech.spend_threshold ?? 500000),
      reward_type: String(mech.reward_type ?? 'cashback'),
      reward_value: Number(mech.reward_value ?? 5),
      reward_cap: mech.reward_cap ? Number(mech.reward_cap) : undefined,
      duration_days: Number(mech.duration_days ?? 30),
      eligible_categories: (mech.eligible_categories as string[]) ?? [],
      target_corridors: (mech.target_corridors as string[]) ?? undefined,
      travel_timing: String(mech.travel_timing ?? ''),
      xb_min_trx: mech.xb_min_trx ? Number(mech.xb_min_trx) : undefined,
      slices,
    });

    // Hydrate Step4 (assumptions)
    setStep4({
      take_up_rate: Number(asmp.take_up_rate ?? 15),
      control_group_pct: Number(asmp.control_group_pct ?? 15),
      incremental_spend_lift: Number(asmp.incremental_spend_lift ?? 20),
      avg_transactions_per_month: Number(asmp.avg_transactions_per_month ?? 4),
    });

    setLoadingCampaign(false);
  }

  const xbStats = useMemo(() => {
    if (step2.data_source !== 'vif_xb_intelligence') return null;
    const matched = filterCardholders(step2.ch_filters ?? {});
    return computeSegmentStats(matched);
  }, [step2.data_source, step2.ch_filters]);

  async function handleSimulate() {
    setSaving(true);
    const issuer = getSession();
    if (!issuer) { router.replace('/login'); return; }

    const primarySlice = step3.slices[0];
    const primarySegment = {
      segment_name: step3.segment_name || primarySlice?.label || 'Segment',
      audience_size: step3.slices.reduce((s, sl) => s + sl.audience_size, 0) || step3.audience_size,
      avg_monthly_spend: primarySlice?.avg_monthly_spend ?? step3.avg_monthly_spend,
      segment_type: primarySlice?.segment_type ?? step3.segment_type,
      data_source: step2.data_source,
    };
    const primaryMechanics = {
      campaign_type: primarySlice?.mechanics.campaign_type ?? step3.campaign_type,
      spend_threshold: primarySlice?.mechanics.spend_threshold ?? step3.spend_threshold,
      reward_type: primarySlice?.mechanics.reward_type ?? step3.reward_type,
      reward_value: primarySlice?.mechanics.reward_value ?? step3.reward_value,
      reward_cap: primarySlice?.mechanics.reward_cap ?? step3.reward_cap,
      duration_days: campaignDurationDays(step1),
      eligible_categories: primarySlice?.mechanics.eligible_categories ?? step3.eligible_categories,
      target_corridors: primarySlice?.mechanics.target_corridors ?? step3.target_corridors,
      travel_timing: step3.travel_timing ?? '',
      xb_min_trx: primarySlice?.mechanics.xb_min_trx ?? step3.xb_min_trx,
    };

    // Update campaign name/description
    await supabase
      .from('campaigns')
      .update({
        name: step1.name,
        description: step1.description,
        status: 'simulated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Update campaign_inputs (upsert by campaign_id)
    await supabase
      .from('campaign_inputs')
      .update({
        data_source: step2.data_source,
        segment_data: {
          segment_name: primarySegment.segment_name,
          audience_size: primarySegment.audience_size,
          avg_monthly_spend: primarySegment.avg_monthly_spend,
          segment_type: primarySegment.segment_type,
          vif_segment_id: null,
          data_source: step2.data_source,
          slices: step3.slices,
          ...(step2.data_source === 'vif_xb_intelligence' && {
            ch_filters: step2.ch_filters,
            xb_stats: xbStats ? {
              active_traveller_pct: xbStats.activeTravellerPct,
              avg_travel_prob_active: xbStats.avgTravelProbActive,
              avg_travel_prob_inactive: xbStats.avgTravelProbInactive,
              avg_xb_share: xbStats.avgXbShare,
              avg_yoy: xbStats.avgYoY,
              top_corridor: xbStats.topCorridor,
              top_persona: xbStats.topPersona,
            } : null,
          }),
        },
        mechanics_config: {
          ...primaryMechanics,
          reward_cap: primaryMechanics.reward_cap ?? null,
          target_corridors: primaryMechanics.target_corridors ?? [],
          travel_timing: primaryMechanics.travel_timing ?? '',
          xb_min_trx: primaryMechanics.xb_min_trx ?? null,
          slice_mechanics: step3.slices.map(s => ({ label: s.label, ...s.mechanics })),
        },
        assumptions: {
          take_up_rate: step4.take_up_rate,
          control_group_pct: step4.control_group_pct,
          incremental_spend_lift: step4.incremental_spend_lift,
          avg_transactions_per_month: step4.avg_transactions_per_month,
        },
      })
      .eq('campaign_id', id);

    const sim = runSimulation(primarySegment, primaryMechanics, { ...step4 }, xbStats ?? undefined);

    // Upsert simulation results
    await supabase
      .from('simulation_results')
      .update({
        projected_budget: sim.projected_budget,
        projected_uplift_pct: sim.projected_uplift_pct,
        projected_roi: sim.projected_roi,
        projected_activated_cardholders: sim.projected_activated_cardholders,
        cost_per_cardholder: sim.cost_per_cardholder,
        sensitivity_data: {
          sensitivity: sim.sensitivity_data,
          incremental_revenue: sim.incremental_revenue,
          uplift_per_cardholder_idr: sim.uplift_per_cardholder_idr,
          total_reward_payout: sim.total_reward_payout,
          break_even_spend_lift: sim.break_even_spend_lift,
          break_even_take_up_rate: sim.break_even_take_up_rate,
        },
        ai_recommendations: sim.ai_recommendations,
        simulated_at: new Date().toISOString(),
      })
      .eq('campaign_id', id);

    setSaving(false);
    router.push(`/campaigns/${id}`);
  }

  const isWideStep = step === 2 || step === 3;

  if (loadingCampaign) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen" style={{ background: '#f8f9fc' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 px-8 py-3.5 flex items-center gap-8"
          style={{ background: 'rgba(248,249,252,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(221,227,245,0.5)' }}>
          <div>
            <p className="text-xs font-medium" style={{ color: '#8894b4' }}>Campaign Decisioning Studio</p>
            <h1 className="text-sm font-semibold leading-tight" style={{ color: '#07143a' }}>Edit Campaign</h1>
          </div>
          <div className="flex-1 flex justify-center">
            <WizardProgress currentStep={step} />
          </div>
          <div style={{ width: 140 }} />
        </div>

        <div className={isWideStep ? 'px-8 py-10 max-w-6xl mx-auto' : 'px-8 py-10 max-w-2xl mx-auto'}>
          {step === 1 && (
            <Step1Details data={step1} onChange={setStep1} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2DataInput
              data={step2}
              onChange={setStep2}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3AudienceMechanics
              data={step3}
              dataSource={step2.data_source}
              chFilters={step2.ch_filters}
              xbStats={xbStats}
              durationDays={campaignDurationDays(step1)}
              onChange={setStep3}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Assumptions
              step1={step1}
              step2={step2}
              step3={step3}
              data={step4}
              xbStats={xbStats}
              onChange={setStep4}
              onSimulate={handleSimulate}
              onBack={() => setStep(3)}
              loading={saving}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
