'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import SimulationDashboard from '@/components/campaign/SimulationDashboard';
import BudgetOptimizer from '@/components/campaign/BudgetOptimizer';
import CampaignExport from '@/components/campaign/CampaignExport';
import { getSession } from '@/lib/auth';
import { supabase, Campaign, SimulationResult } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/button';
import { ArrowLeft, Download, CircleCheck as CheckCircle2, RefreshCw, ChartBar as BarChart2, Pencil } from 'lucide-react';
import { formatIDR, formatCount } from '@/lib/utils';
import { runSimulation } from '@/lib/simulation';

type FullCampaign = Campaign & {
  campaign_inputs?: {
    data_source: string;
    segment_data: Record<string, unknown>;
    mechanics_config: Record<string, unknown>;
    assumptions: Record<string, unknown>;
  } | null;
  simulation_results?: SimulationResult | null;
};

function statusVariant(status: string): 'neutral' | 'info' | 'success' | 'gold' {
  switch (status) {
    case 'draft': return 'neutral';
    case 'simulated': return 'info';
    case 'launched': return 'success';
    case 'completed': return 'gold';
    default: return 'neutral';
  }
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<FullCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [resimulating, setResimulating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const issuer = getSession();

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace('/login'); return; }
    loadCampaign(id);
  }, [id, router]);

  async function loadCampaign(campaignId: string) {
    const { data } = await supabase
      .from('campaigns')
      .select('*, campaign_inputs(*), simulation_results(*)')
      .eq('id', campaignId)
      .maybeSingle();
    setCampaign(data as FullCampaign);
    setLoading(false);
  }

  async function handleCompleteAndDownload() {
    if (!campaign) return;
    setCompleting(true);

    await supabase
      .from('campaigns')
      .update({ status: 'completed', launched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', campaign.id);

    // Build CSV
    const seg = campaign.campaign_inputs?.segment_data as Record<string, unknown> | undefined;
    const mech = campaign.campaign_inputs?.mechanics_config as Record<string, unknown> | undefined;
    const asmp = campaign.campaign_inputs?.assumptions as Record<string, unknown> | undefined;
    const sim = campaign.simulation_results;

    const rows: string[][] = [
      ['Field', 'Value'],
      // Campaign
      ['Campaign Name', campaign.name],
      ['Description', campaign.description ?? ''],
      ['Status', 'Completed'],
      ['Created At', campaign.created_at],
      ['Completed At', new Date().toISOString()],
      [''],
      // Segment
      ['--- SEGMENT ---', ''],
      ['Segment Name', String(seg?.segment_name ?? '')],
      ['Data Source', campaign.campaign_inputs?.data_source ?? ''],
      ['Audience Size', String(seg?.audience_size ?? '')],
      ['Avg Monthly Spend (IDR)', String(seg?.avg_monthly_spend ?? '')],
      ['Segment Type', String(seg?.segment_type ?? '')],
      [''],
      // Mechanics
      ['--- MECHANICS ---', ''],
      ['Campaign Type', String(mech?.campaign_type ?? '')],
      ['Spend Threshold (IDR)', String(mech?.spend_threshold ?? '')],
      ['Reward Type', String(mech?.reward_type ?? '')],
      ['Reward Value', String(mech?.reward_value ?? '')],
      ['Reward Cap (IDR)', String(mech?.reward_cap ?? 'None')],
      ['Duration (days)', String(mech?.duration_days ?? '')],
      ['Eligible Categories', ((mech?.eligible_categories as string[]) ?? []).join('; ')],
      ['Target Corridors', ((mech?.target_corridors as string[]) ?? []).join('; ')],
      ['Travel Timing', String(mech?.travel_timing ?? '')],
      ['Min XB Transactions', String(mech?.xb_min_trx ?? '')],
      [''],
      // Assumptions
      ['--- ASSUMPTIONS ---', ''],
      ['Take-up Rate (%)', String(asmp?.take_up_rate ?? '')],
      ['Control Group (%)', String(asmp?.control_group_pct ?? '')],
      ['Incremental Spend Lift (%)', String(asmp?.incremental_spend_lift ?? '')],
      ['Avg Transactions / Month', String(asmp?.avg_transactions_per_month ?? '')],
      [''],
      // Simulation Results
      ['--- SIMULATION RESULTS ---', ''],
      ['Projected Budget (IDR)', sim ? String(Math.round(sim.projected_budget)) : ''],
      ['Projected ROI (%)', sim ? String(sim.projected_roi.toFixed(2)) : ''],
      ['Projected Uplift (%)', sim ? String(sim.projected_uplift_pct.toFixed(2)) : ''],
      ['Projected Activated Cardholders', sim ? String(sim.projected_activated_cardholders) : ''],
      ['Cost per Cardholder (IDR)', sim ? String(Math.round(sim.cost_per_cardholder)) : ''],
    ];

    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name.replace(/[^a-z0-9]/gi, '_')}_campaign_summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await loadCampaign(campaign.id);
    setCompleting(false);
  }

  async function handleResimulate() {
    if (!campaign?.campaign_inputs) return;
    setResimulating(true);
    const { segment_data, mechanics_config, assumptions, data_source } = campaign.campaign_inputs;

    const seg = {
      segment_name: String(segment_data.segment_name || ''),
      audience_size: Number(segment_data.audience_size || 0),
      avg_monthly_spend: Number(segment_data.avg_monthly_spend || 0),
      segment_type: String(segment_data.segment_type || ''),
      data_source: String(data_source || 'manual'),
    };
    const mech = {
      campaign_type: String(mechanics_config.campaign_type || 'spend_stimulation'),
      spend_threshold: Number(mechanics_config.spend_threshold || 0),
      reward_type: String(mechanics_config.reward_type || 'cashback'),
      reward_value: Number(mechanics_config.reward_value || 5),
      duration_days: Number(mechanics_config.duration_days || 30),
      eligible_categories: (mechanics_config.eligible_categories as string[]) || [],
    };
    const asmp = {
      take_up_rate: Number(assumptions.take_up_rate || 15),
      control_group_pct: Number(assumptions.control_group_pct || 15),
      incremental_spend_lift: Number(assumptions.incremental_spend_lift || 20),
      avg_transactions_per_month: Number(assumptions.avg_transactions_per_month || 4),
    };

    const sim = runSimulation(seg, mech, asmp);

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
          total_reward_payout: sim.total_reward_payout,
          break_even_take_up_rate: sim.break_even_take_up_rate,
        },
        ai_recommendations: sim.ai_recommendations,
        simulated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaign.id);

    await supabase
      .from('campaigns')
      .update({ status: 'simulated', updated_at: new Date().toISOString() })
      .eq('id', campaign.id);

    await loadCampaign(campaign.id);
    setResimulating(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="font-medium" style={{ color: '#07143a' }}>Campaign not found</p>
          <Link href="/campaigns">
            <Button variant="secondary" icon={<ArrowLeft size={15} />}>Back to Campaigns</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const seg = campaign.campaign_inputs?.segment_data as Record<string, unknown> | undefined;
  const mech = campaign.campaign_inputs?.mechanics_config as Record<string, unknown> | undefined;
  const asmp = campaign.campaign_inputs?.assumptions as Record<string, unknown> | undefined;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/campaigns">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: '#f0f3fb', border: '1px solid #dde3f5' }}
            >
              <ArrowLeft size={15} style={{ color: '#4a5578' }} />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate" style={{ color: '#07143a' }}>{campaign.name}</h1>
              <Badge variant={statusVariant(campaign.status)}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-sm mt-0.5 truncate" style={{ color: '#4a5578' }}>{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/campaigns/${campaign.id}/edit`}>
              <Button variant="secondary" size="sm" icon={<Pencil size={14} />}>
                Edit
              </Button>
            </Link>
            {campaign.simulation_results && issuer && (
              <CampaignExport
                campaign={campaign}
                inputs={campaign.campaign_inputs}
                result={campaign.simulation_results}
                issuerName={issuer.name}
              />
            )}
            {(campaign.status === 'simulated' || campaign.status === 'launched') && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  onClick={handleResimulate}
                  loading={resimulating}
                >
                  Re-simulate
                </Button>
                <Button
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={handleCompleteAndDownload}
                  loading={completing}
                >
                  Complete & Download
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left column: inputs */}
          <div className="col-span-3 space-y-4">
            {seg && (
              <Card padding="sm">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8894b4' }}>Segment</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Name</p>
                    <p className="text-sm font-medium" style={{ color: '#07143a' }}>{String(seg.segment_name || '—')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: '#8894b4' }}>Audience</p>
                      <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
                        {formatCount(Number(seg.audience_size || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#8894b4' }}>Avg Spend</p>
                      <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
                        {formatIDR(Number(seg.avg_monthly_spend || 0))}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Type</p>
                    <p className="text-sm" style={{ color: '#4a5578' }}>{String(seg.segment_type || '—')}</p>
                  </div>
                </div>
              </Card>
            )}

            {mech && (
              <Card padding="sm">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8894b4' }}>Mechanics</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: '#8894b4' }}>Threshold</p>
                      <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
                        {formatIDR(Number(mech.spend_threshold || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#8894b4' }}>Duration</p>
                      <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{String(mech.duration_days || '—')}d</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Reward</p>
                    <p className="text-sm" style={{ color: '#4a5578' }}>
                      {String(mech.reward_type || '—')} &middot; {String(mech.reward_value || '—')}
                      {mech.reward_type === 'cashback' ? '%' : ''}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {asmp && (
              <Card padding="sm">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8894b4' }}>Assumptions</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Take-up</p>
                    <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{String(asmp.take_up_rate || '—')}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Control</p>
                    <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{String(asmp.control_group_pct || '—')}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Spend Lift</p>
                    <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{String(asmp.incremental_spend_lift || '—')}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#8894b4' }}>Txn/mo</p>
                    <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{String(asmp.avg_transactions_per_month || '—')}</p>
                  </div>
                </div>
              </Card>
            )}

            {seg && mech && asmp && (
              <BudgetOptimizer
                segment={{
                  segment_name: String(seg.segment_name || ''),
                  audience_size: Number(seg.audience_size || 0),
                  avg_monthly_spend: Number(seg.avg_monthly_spend || 0),
                  segment_type: String(seg.segment_type || ''),
                  data_source: campaign.campaign_inputs?.data_source || 'manual',
                }}
                mechanics={{
                  campaign_type: String(mech.campaign_type || 'spend_stimulation'),
                  spend_threshold: Number(mech.spend_threshold || 0),
                  reward_type: String(mech.reward_type || 'cashback'),
                  reward_value: Number(mech.reward_value || 5),
                  duration_days: Number(mech.duration_days || 30),
                  eligible_categories: (mech.eligible_categories as string[]) || [],
                }}
                assumptions={{
                  take_up_rate: Number(asmp.take_up_rate || 15),
                  control_group_pct: Number(asmp.control_group_pct || 15),
                  incremental_spend_lift: Number(asmp.incremental_spend_lift || 20),
                  avg_transactions_per_month: Number(asmp.avg_transactions_per_month || 4),
                }}
              />
            )}
          </div>

          {/* Right column: simulation results */}
          <div className="col-span-9">
            {campaign.simulation_results ? (
              <SimulationDashboard result={campaign.simulation_results} />
            ) : (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#eff6ff' }}>
                  <BarChart2 size={20} style={{ color: '#1434cb' }} />
                </div>
                <p className="font-medium mb-1" style={{ color: '#07143a' }}>No simulation results</p>
                <p className="text-sm" style={{ color: '#8894b4' }}>Run a simulation to see projected ROI and recommendations.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
