'use client';
import { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Target, Download, ArrowUpRight, RefreshCw, ChevronRight, Zap, ShieldAlert, Rocket, MapPin, Users, DollarSign } from 'lucide-react';
import {
  CARDHOLDER_DATASET, filterCardholders, computeSegmentStats,
  Cardholder, CardTier, DfmcSegment,
} from '@/lib/cardholder-data';
import { formatIDR, formatCount } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'watch';
type SignalType = 'opportunity' | 'alert' | 'momentum';

type AiRec = {
  id: string;
  priority: Priority;
  signalType: SignalType;
  title: string;
  rationale: string;
  signal: string;
  audience: number;
  estimatedBudget: number;
  estimatedRoi: number;
  corridors: string[];
  tiers: CardTier[];
  filter: { card_tiers?: CardTier[]; dfmc_segments?: DfmcSegment[]; travel_status?: ['Active Traveller' | 'Non-Active Traveller']; min_active_decile?: number; min_inactive_decile?: number; };
  mechanic: string;
  estimatedSpendUplift: number;
  // Structured fields for CSV export
  rewardType: string;
  rewardValue: string;
  rewardCap: string;
  spendThreshold: string;
  reviewedAt: string;
};

// ─── Data-driven recommendation engine ───────────────────────────────────────

function buildRecommendations(): AiRec[] {
  const all = CARDHOLDER_DATASET;
  const n = all.length;
  const recs: AiRec[] = [];

  // ── 1. High-propensity Infinite + Signature travellers with strong YoY ────
  const premiumActive = filterCardholders({
    card_tiers: ['Infinite', 'Signature'],
    travel_status: ['Active Traveller'],
    min_active_decile: 7,
  });
  const premiumStats = computeSegmentStats(premiumActive);

  if (premiumActive.length > 0 && premiumStats.avgYoY > 10) {
    const corridors = premiumStats.top3Corridors.map(c => c.code);
    const budget = Math.round(premiumActive.length * 0.15 * 0.05 * premiumStats.avgSpendPerTrip);
    const uplift = Math.round(premiumActive.length * 0.85 * (premiumStats.avgSpendPerTrip * 0.20));
    const roi = budget > 0 ? Math.round(((uplift - budget) / budget) * 100) : 0;
    recs.push({
      id: 'premium-xb-upsell',
      priority: 'high',
      signalType: 'opportunity',
      title: 'Premium Tier XB Upsell — Capture Organic Momentum',
      rationale: `Infinite & Signature cardholders in Active Traveller D7+ are growing at +${premiumStats.avgYoY}% YoY XB spend. Their avg trip spend of ${formatIDR(premiumStats.avgSpendPerTrip)} is well above portfolio average. A tiered cashback upsell on top corridors (${corridors.slice(0, 2).join(', ')}) can capture incremental wallet share before competitors do.`,
      signal: `+${premiumStats.avgYoY}% YoY XB spend · ${formatCount(premiumActive.length)} CHs · Avg trip ${formatIDR(premiumStats.avgSpendPerTrip)}`,
      audience: premiumActive.length,
      estimatedBudget: budget,
      estimatedRoi: roi,
      corridors,
      tiers: ['Infinite', 'Signature'],
      filter: { card_tiers: ['Infinite', 'Signature'], travel_status: ['Active Traveller'], min_active_decile: 7 },
      mechanic: '5% XB cashback capped at IDR 500K, corridors: top 2',
      estimatedSpendUplift: uplift,
      rewardType: 'xb_cashback',
      rewardValue: '5%',
      rewardCap: 'IDR 500,000',
      spendThreshold: '',
      reviewedAt: 'Portfolio review · Today',
    });
  }

  // ── 2. Lapsed high-potential travellers — defensive reactivation ───────────
  const lapsedHighPotential = filterCardholders({
    dfmc_segments: ['High Potential'],
    travel_status: ['Non-Active Traveller'],
    min_inactive_decile: 6,
  });
  const lapsedStats = computeSegmentStats(lapsedHighPotential);

  if (lapsedHighPotential.length > 0) {
    const yoyLabel = lapsedStats.avgYoY < 0 ? `${lapsedStats.avgYoY.toFixed(1)}%` : `+${lapsedStats.avgYoY.toFixed(1)}%`;
    const isAlarming = lapsedStats.avgYoY < -5;
    const budget = Math.round(lapsedHighPotential.length * 0.12 * 75000);
    const uplift = Math.round(lapsedHighPotential.length * 0.88 * (lapsedStats.avgSpendPerTrip * 0.15));
    const roi = budget > 0 ? Math.round(((uplift - budget) / budget) * 100) : 0;
    recs.push({
      id: 'lapsed-reactivation',
      priority: isAlarming ? 'high' : 'medium',
      signalType: isAlarming ? 'alert' : 'opportunity',
      title: `High-Potential Non-Travellers — ${isAlarming ? 'Alarming Churn Signal' : 'Reactivation Window'}`,
      rationale: `${formatCount(lapsedHighPotential.length)} High Potential cardholders are classified Non-Active Traveller with moderate-to-high XB propensity (D6+). YoY XB trend is ${yoyLabel}. ${isAlarming ? 'This is a churn risk — act before they defect to competing issuers.' : 'This is an untapped reactivation opportunity with strong propensity scores.'} A fixed voucher with a low threshold tends to outperform cashback for this segment.`,
      signal: `${yoyLabel} YoY · D6+ inactive propensity · ${formatCount(lapsedHighPotential.length)} CHs`,
      audience: lapsedHighPotential.length,
      estimatedBudget: budget,
      estimatedRoi: roi,
      corridors: lapsedStats.top3Corridors.map(c => c.code),
      tiers: ['Gold', 'Platinum'],
      filter: { dfmc_segments: ['High Potential'], travel_status: ['Non-Active Traveller'], min_inactive_decile: 6 },
      mechanic: 'IDR 150K fixed voucher on first XB txn ≥ IDR 500K',
      estimatedSpendUplift: uplift,
      rewardType: 'voucher',
      rewardValue: 'IDR 150,000',
      rewardCap: '',
      spendThreshold: 'IDR 500,000',
      reviewedAt: 'Portfolio review · Today',
    });
  }

  // ── 3. Mid-tier mass-scale corridor push (momentum signal) ────────────────
  const midTierActive = filterCardholders({
    card_tiers: ['Gold', 'Platinum'],
    travel_status: ['Active Traveller'],
    min_active_decile: 6,
  });
  const midStats = computeSegmentStats(midTierActive);

  if (midTierActive.length > 0) {
    const topCorridor = midStats.topCorridor;
    const corridorCHs = midTierActive.filter(ch => ch.l12m_spend_top_corridor === topCorridor);
    const budget = Math.round(midTierActive.length * 0.18 * 0.04 * midStats.avgSpendPerTrip);
    const uplift = Math.round(midTierActive.length * 0.82 * (midStats.avgSpendPerTrip * 0.18));
    const roi = budget > 0 ? Math.round(((uplift - budget) / budget) * 100) : 0;
    const yoyPos = midStats.avgYoY >= 0;
    recs.push({
      id: 'mid-tier-corridor-push',
      priority: 'medium',
      signalType: 'momentum',
      title: `Gold–Platinum Corridor Push — ${topCorridor} Concentration Detected`,
      rationale: `${((corridorCHs.length / midTierActive.length) * 100).toFixed(0)}% of Gold–Platinum active travellers (D6+) share ${topCorridor} as their top corridor, making it a concentrated targeting opportunity. Portfolio-wide XB spend for this tier is trending ${yoyPos ? `+${midStats.avgYoY}%` : `${midStats.avgYoY}%`} YoY. A corridor-specific cashback offer on ${topCorridor} with a moderate threshold maximises engagement without over-rewarding organic spend.`,
      signal: `${topCorridor} = top corridor · ${yoyPos ? '+' : ''}${midStats.avgYoY}% YoY · ${formatCount(midTierActive.length)} CHs`,
      audience: midTierActive.length,
      estimatedBudget: budget,
      estimatedRoi: roi,
      corridors: [topCorridor, ...midStats.top3Corridors.slice(1).map(c => c.code)],
      tiers: ['Gold', 'Platinum'],
      filter: { card_tiers: ['Gold', 'Platinum'], travel_status: ['Active Traveller'], min_active_decile: 6 },
      mechanic: `4% XB cashback on ${topCorridor} spend, threshold 20% above avg trip`,
      estimatedSpendUplift: uplift,
      rewardType: 'xb_cashback',
      rewardValue: '4%',
      rewardCap: '',
      spendThreshold: `${Math.round(midStats.avgSpendPerTrip * 1.2).toLocaleString('id-ID')}`,
      reviewedAt: 'Portfolio review · Today',
    });
  }

  return recs.slice(0, 3);
}

// ─── CSV download ─────────────────────────────────────────────────────────────

function csvEscape(v: string | number): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadLeadsCsv(rec: AiRec) {
  const leads = filterCardholders(rec.filter as Parameters<typeof filterCardholders>[0]);

  const headers = [
    'hashed_card_number_sha256',
    'card_tier',
    'dfmc_segment',
    'affluent_persona',
    'consumer_persona',
    'travel_status',
    'mob',
    // Campaign assignment from the recommendation
    'campaign_segment',
    'campaign_type',
    'reward_type',
    'reward_value',
    'reward_cap',
    'spend_threshold_idr',
    'target_corridors',
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

  const dataRows = leads.map(ch => [
    ch.card_hash_sha256,
    ch.card_tier,
    ch.dfmc_segment,
    ch.affluent_persona,
    ch.consumer_persona,
    ch.active_xb_ind,
    ch.mob,
    rec.title,
    rec.signalType,
    rec.rewardType,
    rec.rewardValue,
    rec.rewardCap,
    rec.spendThreshold,
    rec.corridors.join('|'),
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
  ].map(csvEscape).join(','));

  const csv = [headers.join(','), ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_${rec.id}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; color: string; dot: string }> = {
  high:   { label: 'High Priority', bg: 'rgba(220,38,38,0.06)',   color: '#dc2626', dot: '#dc2626' },
  medium: { label: 'Medium',        bg: 'rgba(20,52,203,0.05)',   color: '#1434cb', dot: '#1434cb' },
  watch:  { label: 'Watch',         bg: 'rgba(217,119,6,0.06)',   color: '#d97706', dot: '#d97706' },
};

const SIGNAL_CONFIG: Record<SignalType, { Icon: typeof Sparkles; color: string; bg: string }> = {
  opportunity: { Icon: Rocket,      color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  alert:       { Icon: ShieldAlert, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  momentum:    { Icon: TrendingUp,  color: '#1434cb', bg: 'rgba(20,52,203,0.08)' },
};

function RecCard({ rec }: { rec: AiRec }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const priority = PRIORITY_CONFIG[rec.priority];
  const signal = SIGNAL_CONFIG[rec.signalType];
  const SignalIcon = signal.Icon;
  const roiPos = rec.estimatedRoi >= 0;

  function handleDownload() {
    setDownloading(true);
    setTimeout(() => {
      downloadLeadsCsv(rec);
      setDownloading(false);
    }, 400);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: '#fff',
        border: expanded ? `1.5px solid ${priority.color}30` : '1px solid rgba(221,227,245,0.9)',
        boxShadow: expanded ? `0 6px 24px ${priority.color}12` : '0 1px 4px rgba(7,20,58,0.04)',
      }}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: priority.color, opacity: 0.75 }} />

        <div className="flex-1 px-5 py-4">
          {/* Top row: icon + title + badges + expand */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: signal.bg }}>
              <SignalIcon size={16} style={{ color: signal.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: priority.bg, color: priority.color }}>
                  {priority.label}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                  style={{ background: 'rgba(0,0,0,0.045)', color: '#8894b4' }}>
                  {rec.signalType}
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug mb-1" style={{ color: '#07143a' }}>{rec.title}</p>
              <p className="text-xs" style={{ color: '#8894b4' }}>{rec.signal}</p>
            </div>

            <button type="button" onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-50 mt-0.5"
              style={{ color: '#b0bdd6' }}>
              <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {/* Bottom row: KPIs + download */}
          <div className="flex items-center gap-3 mt-4 pl-13" style={{ paddingLeft: 52 }}>
            {/* KPI pills */}
            <div className="flex items-center gap-2 flex-1">
              {[
                { Icon: Users,      label: 'Leads',         value: formatCount(rec.audience),                       color: '#1434cb', bg: 'rgba(20,52,203,0.05)' },
                { Icon: DollarSign, label: 'Est. Budget',   value: formatIDR(rec.estimatedBudget),                  color: '#07143a', bg: '#f8f9fc' },
                { Icon: TrendingUp, label: 'Spend Uplift',  value: formatIDR(rec.estimatedSpendUplift),             color: '#16a34a', bg: 'rgba(22,163,74,0.05)' },
                { Icon: TrendingUp, label: 'Est. ROI',      value: `${roiPos ? '+' : ''}${rec.estimatedRoi}%`,      color: roiPos ? '#16a34a' : '#dc2626', bg: roiPos ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.05)' },
              ].map(({ Icon, label, value, color, bg }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: bg }}>
                  <Icon size={12} style={{ color, opacity: 0.6 }} />
                  <div>
                    <p className="text-xs leading-none mb-0.5" style={{ color: '#b0bdd6' }}>{label}</p>
                    <p className="text-sm font-bold leading-none" style={{ color }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Download button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
              style={{
                background: 'rgba(22,163,74,0.07)',
                color: '#16a34a',
                border: '1px solid rgba(22,163,74,0.2)',
                whiteSpace: 'nowrap',
              }}
            >
              {downloading
                ? <div style={{ width: 11, height: 11, border: '2px solid rgba(22,163,74,0.3)', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Download size={12} />}
              {downloading ? 'Preparing…' : `Download ${formatCount(rec.audience)} leads`}
            </button>
          </div>

          {/* Expanded detail panel */}
          {expanded && (
            <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(221,227,245,0.7)' }}>
              <div className="rounded-xl px-3.5 py-3" style={{ background: '#fafbfe', border: '1px solid rgba(221,227,245,0.7)' }}>
                <p className="text-xs leading-relaxed" style={{ color: '#4a5578' }}>{rec.rationale}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex-1 rounded-xl px-3 py-2" style={{ background: 'rgba(20,52,203,0.04)' }}>
                  <p className="font-semibold mb-1" style={{ color: '#1434cb' }}>Suggested Mechanic</p>
                  <p style={{ color: '#4a5578' }}>{rec.mechanic}</p>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(20,52,203,0.04)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin size={10} style={{ color: '#1434cb' }} />
                    <p className="font-semibold" style={{ color: '#1434cb' }}>Corridors</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rec.corridors.slice(0, 4).map(c => (
                      <span key={c} className="px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: 'rgba(20,52,203,0.1)', color: '#1434cb' }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="text-xs self-end ml-auto" style={{ color: '#b0bdd6' }}>{rec.reviewedAt}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AiCampaignRecommendations() {
  const [refreshKey, setRefreshKey] = useState(0);
  const recs = useMemo(() => buildRecommendations(), [refreshKey]);

  const lastRun = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }, [refreshKey]);

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#07143a 0%,#1434cb 100%)' }}>
            <Sparkles size={14} style={{ color: '#f7b600' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#07143a' }}>AI Campaign Recommendations</h2>
            <p className="text-xs" style={{ color: '#8894b4' }}>Auto-generated from live portfolio analysis · {lastRun}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </span>
          <button
            type="button"
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#8894b4', border: '1px solid rgba(221,227,245,0.9)' }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Agent context banner */}
      <div className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
        style={{ background: 'linear-gradient(135deg,rgba(7,20,58,0.03) 0%,rgba(20,52,203,0.05) 100%)', border: '1px solid rgba(20,52,203,0.1)' }}>
        <Zap size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#1434cb' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#4a5578' }}>
          AI agent continuously reviews portfolio spend trajectories, YoY trends, propensity score shifts, and corridor concentration to surface the highest-impact campaign opportunities and churn risks. Each recommendation includes a pre-filtered lead list you can download instantly — no manual segmentation required.
        </p>
      </div>

      {/* Recommendation cards */}
      <div className="flex flex-col gap-3">
        {recs.map((rec, i) => (
          <RecCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  );
}
