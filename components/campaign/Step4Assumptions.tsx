'use client';
import { useState } from 'react';
import Button from '@/components/ui/button';
import { ArrowLeft, Zap, Download, CircleCheck as CheckCircle, Calendar, Users, Tag, CreditCard, TrendingUp, MapPin, FileText, ChevronDown } from 'lucide-react';
import { SegmentStats, filterCardholders } from '@/lib/cardholder-data';
import { formatIDR, formatCount } from '@/lib/utils';
import { Step1Data } from './Step1Details';
import { Step2Data } from './Step2DataInput';
import { Step3Data } from './Step3AudienceMechanics';

// Step4Data kept for backwards-compatibility with simulation logic
export type Step4Data = {
  take_up_rate: number;
  control_group_pct: number;
  incremental_spend_lift: number;
  avg_transactions_per_month: number;
};

interface Props {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  data: Step4Data;
  xbStats?: SegmentStats | null;
  onChange: (data: Step4Data) => void;
  onSimulate: () => void;
  onBack: () => void;
  loading?: boolean;
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(221,227,245,0.9)', background: '#fff' }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(221,227,245,0.7)', background: '#fafbfe' }}>
        {icon}
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(221,227,245,0.5)' }}>
      <p className="text-xs" style={{ color: '#8894b4' }}>{label}</p>
      <p className={`text-sm font-semibold text-right`} style={{ color: accent ? '#1434cb' : '#07143a' }}>{value}</p>
    </div>
  );
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadLeadsCsv(step2: Step2Data, step3: Step3Data, campaignName: string) {
  if (step2.data_source !== 'vif_xb_intelligence') return;

  const leads = filterCardholders(step2.ch_filters ?? {});

  // Determine per-slice mechanic if available, otherwise fall back to top-level
  function getSliceMechanics(ch: ReturnType<typeof filterCardholders>[number]) {
    if (!step3.slices?.length) {
      return {
        campaign_segment: step3.segment_name || 'Main Segment',
        campaign_type: step3.campaign_type,
        reward_type: step3.reward_type,
        reward_value: step3.reward_value,
        reward_cap: step3.reward_cap ?? '',
        spend_threshold: step3.spend_threshold,
        target_corridors: (step3.target_corridors ?? []).join('|') || '',
        xb_min_trx: step3.xb_min_trx ?? '',
      };
    }
    // Match cardholder to a slice by card_tier if tier filter exists, else first slice
    const matched = step3.slices.find(sl => {
      const tierFilter = (step2.ch_filters?.card_tiers ?? []);
      return tierFilter.length === 0 || tierFilter.includes(ch.card_tier);
    }) ?? step3.slices[0];
    return {
      campaign_segment: matched.label,
      campaign_type: matched.mechanics.campaign_type,
      reward_type: matched.mechanics.reward_type,
      reward_value: matched.mechanics.reward_value,
      reward_cap: matched.mechanics.reward_cap ?? '',
      spend_threshold: matched.mechanics.spend_threshold,
      target_corridors: (matched.mechanics.target_corridors ?? []).join('|') || '',
      xb_min_trx: matched.mechanics.xb_min_trx ?? '',
    };
  }

  const headers = [
    'hashed_card_number_sha256',
    'card_tier',
    'dfmc_segment',
    'affluent_persona',
    'consumer_persona',
    'travel_status',
    'mob',
    // Campaign assignment
    'campaign_segment',
    'campaign_type',
    'reward_type',
    'reward_value',
    'reward_cap',
    'spend_threshold_idr',
    'target_corridors',
    'xb_min_trx',
    // Propensity
    'active_xb_propensity_score',
    'active_xb_propensity_decile',
    'inactive_xb_propensity_score',
    'inactive_xb_propensity_decile',
    // Spend signals
    'l12m_xb_spend_idr',
    'l12m_xb_trx_count',
    'l12m_avg_spend_per_trip_idr',
    'l12m_xb_yoy_pct',
    'l12m_top_corridor',
    'l12m_total_spend_idr',
  ];

  const dataRows = leads.map(ch => {
    const m = getSliceMechanics(ch);
    return [
      ch.card_hash_sha256,
      ch.card_tier,
      ch.dfmc_segment,
      ch.affluent_persona,
      ch.consumer_persona,
      ch.active_xb_ind,
      ch.mob,
      m.campaign_segment,
      m.campaign_type,
      m.reward_type,
      m.reward_value,
      m.reward_cap,
      m.spend_threshold,
      m.target_corridors,
      m.xb_min_trx,
      ch.travel_next3mnth_prob_active_xb_cp.toFixed(4),
      ch.travel_next3mnth_prob_active_xb_cp_decile,
      ch.travel_next3mnth_prob_inactive_xb_cp.toFixed(4),
      ch.travel_next3mnth_prob_inactive_xb_cp_decile,
      Math.round(ch.l12m_spend_xb_cp),
      ch.l12m_trx_xb_cp,
      Math.round(ch.l12m_avg_spend_pertrip_xb_cp),
      (ch.l12m_spend_xb_cp_yoy * 100).toFixed(1),
      ch.l12m_spend_top_corridor,
      Math.round(ch.l12m_spend_all),
    ].map(csvEscape).join(',');
  });

  const csv = [headers.join(','), ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_${campaignName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDataSource(ds: string) {
  switch (ds) {
    case 'vif_xb_intelligence': return 'VIF XB Intelligence';
    case 'vif_spend_stimulation': return 'VIF Spend Stimulation';
    case 'vif_xb': return 'VIF XB Segment';
    case 'csv_upload': return 'CSV Upload';
    case 'manual': return 'Manual Entry';
    default: return ds;
  }
}

function formatRewardType(rt: string) {
  switch (rt) {
    case 'cashback': return 'Cashback';
    case 'xb_cashback': return 'XB Cashback';
    case 'travel_miles': return 'Travel Miles';
    case 'voucher': return 'Fixed Voucher';
    case 'points': return 'Points Multiplier';
    default: return rt;
  }
}

function formatCampaignType(ct: string) {
  switch (ct) {
    case 'spend_stimulation': return 'Spend Stimulation';
    case 'cross_border': return 'Cross-Border';
    case 'activation': return 'Activation';
    case 'reactivation': return 'Reactivation';
    default: return ct;
  }
}

export default function Step4Assumptions({ step1, step2, step3, data, xbStats, onSimulate, onBack, loading }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [slicesExpanded, setSlicesExpanded] = useState(false);

  const isXbIntel = step2.data_source === 'vif_xb_intelligence';
  const leadCount = isXbIntel ? filterCardholders(step2.ch_filters ?? {}).length : null;

  const primarySlice = step3.slices[0];
  const primaryMechanics = primarySlice?.mechanics ?? {
    campaign_type: step3.campaign_type,
    spend_threshold: step3.spend_threshold,
    reward_type: step3.reward_type,
    reward_value: step3.reward_value,
    reward_cap: step3.reward_cap,
    target_corridors: step3.target_corridors,
  };

  const totalAudience = step3.slices.length > 0
    ? step3.slices.reduce((s, sl) => s + sl.audience_size, 0)
    : step3.audience_size;

  const startFmt = step1.start_date
    ? new Date(step1.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const endFmt = step1.end_date
    ? new Date(step1.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  function handleDownload() {
    setDownloading(true);
    setTimeout(() => {
      downloadLeadsCsv(step2, step3, step1.name || 'campaign');
      setDownloading(false);
    }, 400);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8894b4', letterSpacing: '0.12em' }}>Step 4</p>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#07143a' }}>Review & Confirm</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#4a5578', maxWidth: 480 }}>
          Review all campaign details below. Optionally download the lead list, then run the simulation.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-4">

        {/* Campaign Details */}
        <SectionCard title="Campaign Details" icon={<FileText size={13} style={{ color: '#1434cb' }} />}>
          <Row label="Campaign Name" value={step1.name || '—'} />
          {step1.description && <Row label="Description" value={<span className="max-w-xs truncate block">{step1.description}</span>} />}
          <Row label="Period" value={
            <span className="flex items-center gap-1.5">
              <Calendar size={12} style={{ color: '#8894b4' }} />
              {startFmt} — {endFmt}
            </span>
          } />
        </SectionCard>

        {/* Data Source */}
        <SectionCard title="Data Source" icon={<CreditCard size={13} style={{ color: '#1434cb' }} />}>
          <Row label="Source" value={formatDataSource(step2.data_source)} accent />
          {step2.data_source === 'csv_upload' && step2.csv_filename && (
            <Row label="File" value={step2.csv_filename} />
          )}
          {isXbIntel && step2.ch_filters && (
            <>
              {step2.ch_filters.card_tiers?.length
                ? <Row label="Card Tiers" value={step2.ch_filters.card_tiers.join(', ')} />
                : null}
              {step2.ch_filters.affluent_personas?.length
                ? <Row label="Affluence Tiers" value={step2.ch_filters.affluent_personas.join(', ')} />
                : null}
              {step2.ch_filters.dfmc_segments?.length
                ? <Row label="DFMC Segments" value={step2.ch_filters.dfmc_segments.join(', ')} />
                : null}
              {step2.ch_filters.travel_status?.length
                ? <Row label="Travel Status" value={step2.ch_filters.travel_status.join(', ')} />
                : null}
              {(step2.ch_filters.min_active_decile ?? 1) > 1
                ? <Row label="Active Propensity" value={`D${step2.ch_filters.min_active_decile}+`} />
                : null}
              {(step2.ch_filters.min_inactive_decile ?? 1) > 1
                ? <Row label="Inactive Propensity" value={`D${step2.ch_filters.min_inactive_decile}+`} />
                : null}
            </>
          )}
        </SectionCard>

        {/* Audience */}
        <SectionCard title="Audience" icon={<Users size={13} style={{ color: '#1434cb' }} />}>
          <Row label="Total Audience" value={formatCount(totalAudience)} accent />
          {isXbIntel && xbStats && (
            <>
              <Row label="Active Travellers" value={`${xbStats.activeTravellerPct}%`} />
              <Row label="Avg XB Spend / yr" value={formatIDR(xbStats.avgSpendXb)} />
              <Row label="Avg Spend / Trip" value={formatIDR(xbStats.avgSpendPerTrip)} />
              <Row label="Top Corridor" value={xbStats.topCorridor} accent />
              <Row label="YoY XB Growth" value={
                <span style={{ color: xbStats.avgYoY >= 0 ? '#16a34a' : '#dc2626' }}>
                  {xbStats.avgYoY >= 0 ? '+' : ''}{xbStats.avgYoY}%
                </span>
              } />
            </>
          )}
          {step3.slices.length > 1 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setSlicesExpanded(x => !x)}
                className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: '#1434cb' }}
              >
                <ChevronDown size={12} style={{ transform: slicesExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                {slicesExpanded ? 'Hide' : 'Show'} {step3.slices.length} audience slices
              </button>
              {slicesExpanded && (
                <div className="mt-2 space-y-1">
                  {step3.slices.map(sl => (
                    <div key={sl.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: '#fafbfe' }}>
                      <span style={{ color: '#4a5578' }}>{sl.label}</span>
                      <span className="font-semibold" style={{ color: '#07143a' }}>{formatCount(sl.audience_size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Mechanics */}
        <SectionCard title="Campaign Mechanics" icon={<Tag size={13} style={{ color: '#1434cb' }} />}>
          <Row label="Campaign Type" value={formatCampaignType(primaryMechanics.campaign_type)} />
          <Row label="Reward Type" value={formatRewardType(primaryMechanics.reward_type)} accent />
          <Row label="Reward Value" value={
            primaryMechanics.reward_type === 'cashback' || primaryMechanics.reward_type === 'xb_cashback'
              ? `${primaryMechanics.reward_value}%`
              : primaryMechanics.reward_type === 'voucher'
              ? formatIDR(primaryMechanics.reward_value)
              : `${primaryMechanics.reward_value}x`
          } />
          <Row label="Spend Threshold" value={formatIDR(primaryMechanics.spend_threshold)} />
          {primaryMechanics.reward_cap && primaryMechanics.reward_cap > 0 && (
            <Row label="Reward Cap" value={formatIDR(primaryMechanics.reward_cap)} />
          )}
          {primaryMechanics.target_corridors?.length
            ? <Row label="Target Corridors" value={
                <span className="flex items-center gap-1">
                  <MapPin size={11} style={{ color: '#8894b4' }} />
                  {primaryMechanics.target_corridors.join(', ')}
                </span>
              } />
            : null}
          {primaryMechanics.xb_min_trx
            ? <Row label="Min XB Transactions" value={`${primaryMechanics.xb_min_trx} txn`} />
            : null}
        </SectionCard>

      </div>

      {/* Lead download (XB Intel only) */}
      {isXbIntel && leadCount !== null && leadCount > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg,rgba(22,163,74,0.05) 0%,rgba(22,163,74,0.03) 100%)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(22,163,74,0.1)' }}>
              <Download size={15} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#07143a' }}>Download Lead List</p>
              <p className="text-xs mt-0.5" style={{ color: '#4a5578' }}>
                {formatCount(leadCount)} cardholders matched your filters — export a CSV with card hash, tier, propensity, corridor &amp; spend data.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#16a34a', color: '#fff', opacity: downloading ? 0.7 : 1, whiteSpace: 'nowrap' }}
          >
            {downloading
              ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Download size={13} />}
            {downloading ? 'Preparing…' : `Download ${formatCount(leadCount)} leads`}
          </button>
        </div>
      )}

      {/* Divider + actions */}
      <div style={{ height: '1px', background: 'rgba(221,227,245,0.6)' }} />
      <div className="flex justify-between">
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack}>Back</Button>
        <Button icon={<Zap size={15} />} onClick={onSimulate} loading={loading}>Run Simulation</Button>
      </div>
    </div>
  );
}
