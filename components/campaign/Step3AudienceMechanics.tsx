'use client';
import { useMemo, useState, useCallback } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  ArrowRight, ArrowLeft, Users, TrendingUp, TrendingDown,
  Trash2, ChevronDown, ChevronUp, Zap, Target,
  DollarSign, MapPin, Grid3X3, Plus, AlertTriangle,
  CheckCircle2, Info, Layers,
} from 'lucide-react';
import {
  filterCardholders, computeSegmentStats, CardholderFilter, SegmentStats,
  ALL_TIERS, ALL_DFMC, ALL_CORRIDORS, ALL_AFFLUENT,
  Cardholder, CardTier, DfmcSegment, AffluentPersona,
} from '@/lib/cardholder-data';
import { formatIDR, formatCount } from '@/lib/utils';

// ─── Public types ─────────────────────────────────────────────────────────────

export type SegmentMechanics = {
  campaign_type: string;
  reward_type: string;
  reward_value: number;
  spend_threshold: number;
  reward_cap?: number;
  target_corridors?: string[];
  eligible_categories?: string[];
  xb_min_trx?: number;
};

export type SegmentSlice = {
  id: string;
  label: string;
  audience_size: number;
  avg_monthly_spend: number;
  avg_spend_per_trip: number;
  avg_yoy: number;
  active_traveller_pct: number;
  top_corridor: string;
  segment_type: string;
  mechanics: SegmentMechanics;
  take_up_rate: number;
  incremental_spend_lift: number;
  control_group_pct: number;
  dim1_value: string;
  dim2_value: string;
};

export type Step3Data = {
  segment_name: string;
  audience_size: number;
  avg_monthly_spend: number;
  segment_type: string;
  campaign_type: string;
  spend_threshold: number;
  reward_type: string;
  reward_value: number;
  reward_cap?: number;
  duration_days: number;
  eligible_categories: string[];
  target_corridors?: string[];
  travel_timing?: string;
  xb_min_trx?: number;
  slices: SegmentSlice[];
};

interface Props {
  data: Step3Data;
  dataSource: string;
  chFilters?: CardholderFilter;
  xbStats?: SegmentStats | null;
  durationDays: number;
  onChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

// ─── Dimension definitions ────────────────────────────────────────────────────

type DimKey = 'card_tier' | 'spend_decile' | 'dfmc' | 'affluence' | 'travel_status' | 'corridor';

type DimDef = {
  key: DimKey;
  label: string;
  shortLabel: string;
  values: string[];
  filter: (ch: Cardholder, v: string) => boolean;
  color: string;
};

const TIER_ORDER: CardTier[] = ['Classic', 'Gold', 'Platinum', 'Signature', 'Infinite'];
const DECILE_GROUPS = ['D1–D2', 'D3–D5', 'D6–D8', 'D9–D10'];
const DECILE_RANGES: Record<string, [number, number]> = { 'D1–D2': [1, 2], 'D3–D5': [3, 5], 'D6–D8': [6, 8], 'D9–D10': [9, 10] };

const DIMS: DimDef[] = [
  {
    key: 'card_tier', label: 'Card Tier', shortLabel: 'Tier', color: '#1434cb',
    values: TIER_ORDER,
    filter: (ch, v) => ch.card_tier === v,
  },
  {
    key: 'spend_decile', label: 'Spend / Trip Decile', shortLabel: 'Decile', color: '#d97706',
    values: DECILE_GROUPS,
    filter: (ch, v) => {
      const [lo, hi] = DECILE_RANGES[v];
      const d = ch.active_xb_ind === 'Active Traveller'
        ? ch.travel_next3mnth_prob_active_xb_cp_decile
        : ch.travel_next3mnth_prob_inactive_xb_cp_decile;
      return d >= lo && d <= hi;
    },
  },
  {
    key: 'dfmc', label: 'DFMC Segment', shortLabel: 'DFMC', color: '#0891b2',
    values: ALL_DFMC,
    filter: (ch, v) => ch.dfmc_segment === (v as DfmcSegment),
  },
  {
    key: 'affluence', label: 'Affluence Tier', shortLabel: 'Affluence', color: '#7c3aed',
    values: ALL_AFFLUENT,
    filter: (ch, v) => ch.affluent_persona === (v as AffluentPersona),
  },
  {
    key: 'travel_status', label: 'Travel Status', shortLabel: 'Status', color: '#16a34a',
    values: ['Active Traveller', 'Non-Active Traveller'],
    filter: (ch, v) => ch.active_xb_ind === v,
  },
  {
    key: 'corridor', label: 'Top Corridor', shortLabel: 'Corridor', color: '#dc2626',
    values: ALL_CORRIDORS.slice(0, 8),
    filter: (ch, v) => ch.l12m_spend_top_corridor === v,
  },
];

const CAMPAIGN_TYPES = [
  { value: 'spend_stimulation',         label: 'Spend Stimulation' },
  { value: 'cross_border',              label: 'Cross-Border Activation' },
  { value: 'cross_border_reactivation', label: 'XB Reactivation' },
  { value: 'travel_upsell',             label: 'Travel Upsell' },
  { value: 'corridor_push',             label: 'Corridor Push' },
  { value: 'dormancy_reactivation',     label: 'Dormancy Reactivation' },
  { value: 'category_push',             label: 'Category Push' },
];

const REWARD_TYPES = [
  { value: 'cashback',          label: 'Cashback (%)' },
  { value: 'xb_cashback',       label: 'XB Cashback (%)' },
  { value: 'fixed_voucher',     label: 'Fixed Voucher (IDR)' },
  { value: 'points_multiplier', label: 'Points Multiplier' },
  { value: 'travel_miles',      label: 'Travel Miles' },
];

// ─── ROI calculation (aligned with simulation.ts) ─────────────────────────────
// - reward paid to activated CHs only
// - spend uplift measured across full target audience (not just activated)
// - ROI = (totalUplift − budget) / budget × 100

function calcReward(m: SegmentMechanics): number {
  let raw = 0;
  if (m.reward_type === 'cashback' || m.reward_type === 'xb_cashback') raw = (m.spend_threshold * m.reward_value) / 100;
  else if (m.reward_type === 'travel_miles') raw = m.reward_value * 0.5;
  else raw = m.reward_value;
  return m.reward_cap && m.reward_cap > 0 ? Math.min(raw, m.reward_cap) : raw;
}

function calcSliceROI(slice: SegmentSlice, durationDays: number): {
  budget: number; roi: number; activated: number; rewardPerCH: number;
  totalUplift: number; spendUpliftPct: number;
} {
  const target = Math.round(slice.audience_size * (1 - slice.control_group_pct / 100));
  const activated = Math.round(target * (slice.take_up_rate / 100));
  const rewardPerCH = calcReward(slice.mechanics);
  const budget = activated * rewardPerCH;

  // Baseline spend for the campaign period (monthly × months)
  const baselineSpend = slice.avg_monthly_spend * (durationDays / 30);
  const upliftPerCH = baselineSpend * (slice.incremental_spend_lift / 100);
  // Uplift across the full target audience
  const totalUplift = target * upliftPerCH;
  const roi = budget > 0 ? ((totalUplift - budget) / budget) * 100 : 0;
  const spendUpliftPct = slice.audience_size > 0
    ? (target / slice.audience_size) * slice.incremental_spend_lift
    : 0;
  return { budget, roi, activated, rewardPerCH, totalUplift, spendUpliftPct };
}

function makeDefaultMechanics(overrides?: Partial<SegmentMechanics>): SegmentMechanics {
  return {
    campaign_type: 'cross_border',
    reward_type: 'xb_cashback',
    reward_value: 5,
    spend_threshold: 1000000,
    target_corridors: [],
    eligible_categories: [],
    ...overrides,
  };
}

// Auto-suggest threshold: 20% above avg spend per trip
function suggestThreshold(avgSpendPerTrip: number): number {
  if (avgSpendPerTrip <= 0) return 1000000;
  return Math.ceil((avgSpendPerTrip * 1.2) / 100000) * 100000;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function sliceFromStats(
  label: string, stats: SegmentStats,
  dim1v: string, dim2v: string,
  mechDefaults: Partial<SegmentMechanics>
): SegmentSlice {
  const threshold = suggestThreshold(stats.avgSpendPerTrip);
  return {
    id: uid(), label,
    audience_size: stats.count,
    avg_monthly_spend: Math.round(stats.avgSpendXb / 12),
    avg_spend_per_trip: stats.avgSpendPerTrip,
    avg_yoy: stats.avgYoY,
    active_traveller_pct: stats.activeTravellerPct,
    top_corridor: stats.topCorridor,
    segment_type: 'cross_border',
    mechanics: makeDefaultMechanics({ ...mechDefaults, spend_threshold: threshold }),
    take_up_rate: 15,
    incremental_spend_lift: 20,
    control_group_pct: 15,
    dim1_value: dim1v,
    dim2_value: dim2v,
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'rgba(221,227,245,0.7)' }} />;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>
      {children}
    </p>
  );
}

function Slider({ label, value, min, max, step, suffix, hint, onChange, color }:
  { label: string; value: number; min: number; max: number; step: number; suffix: string;
    hint?: string; onChange: (v: number) => void; color: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#07143a' }}>{label}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}>{value}{suffix}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
      </div>
      {hint && <p className="text-xs leading-tight" style={{ color: '#8894b4' }}>{hint}</p>}
    </div>
  );
}

// ─── Segment insights ─────────────────────────────────────────────────────────

function SegmentInsights({ slice }: { slice: SegmentSlice }) {
  const insights: { Icon: typeof Info; color: string; text: string }[] = [];

  if (slice.avg_spend_per_trip > 0) {
    insights.push({
      Icon: DollarSign, color: '#1434cb',
      text: `Avg. spend / trip: ${formatIDR(Math.round(slice.avg_spend_per_trip))} — threshold auto-set to 20% above (${formatIDR(suggestThreshold(slice.avg_spend_per_trip))}).`,
    });
  }

  if (slice.active_traveller_pct >= 60) {
    insights.push({ Icon: TrendingUp, color: '#16a34a', text: `${slice.active_traveller_pct}% active travellers — strong XB activation potential.` });
  } else if (slice.active_traveller_pct < 25) {
    insights.push({ Icon: Info, color: '#d97706', text: `Only ${slice.active_traveller_pct}% active travellers. Consider reactivation mechanics.` });
  }

  if (slice.avg_yoy >= 10) {
    insights.push({ Icon: TrendingUp, color: '#16a34a', text: `+${slice.avg_yoy}% YoY XB spend growth — organic momentum to amplify.` });
  } else if (slice.avg_yoy <= -10) {
    insights.push({ Icon: TrendingDown, color: '#dc2626', text: `${slice.avg_yoy}% YoY decline — defensive reactivation campaign recommended.` });
  }

  if (slice.dim2_value.startsWith('D9') || slice.dim1_value.startsWith('D9')) {
    insights.push({ Icon: AlertTriangle, color: '#d97706', text: 'Top decile — raise threshold or add cap to avoid rewarding organic spend.' });
  }

  if (slice.top_corridor && slice.top_corridor !== 'N/A') {
    insights.push({ Icon: MapPin, color: '#1434cb', text: `Top corridor: ${slice.top_corridor}. Add corridor targeting for higher conversion.` });
  }

  if (insights.length === 0) {
    insights.push({ Icon: CheckCircle2, color: '#16a34a', text: 'Segment looks well-formed. Adjust mechanics and assumptions below.' });
  }

  return (
    <div className="space-y-1.5">
      {insights.slice(0, 3).map((ins, i) => {
        const Icon = ins.Icon;
        return (
          <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg"
            style={{ background: `${ins.color}08` }}>
            <Icon size={11} className="flex-shrink-0 mt-0.5" style={{ color: ins.color }} />
            <p className="text-xs leading-snug" style={{ color: '#4a5578' }}>{ins.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Expanded segment panel ───────────────────────────────────────────────────

function SegmentPanel({ slice, onUpdate, onRemove, isXb, durationDays, totalBudget }:
  { slice: SegmentSlice; onUpdate: (s: SegmentSlice) => void; onRemove: () => void;
    isXb: boolean; durationDays: number; totalBudget: number }) {
  const [tab, setTab] = useState<'mechanics' | 'assumptions'>('mechanics');
  const { budget, roi, activated, rewardPerCH, totalUplift, spendUpliftPct } = calcSliceROI(slice, durationDays);
  const roiPos = roi >= 0;
  const suggestedThresh = suggestThreshold(slice.avg_spend_per_trip);

  // Four summary stats: Audience, Spend/Trip Uplift, Budget, ROI
  const summaryStats = [
    { label: 'Audience', value: formatCount(slice.audience_size) },
    { label: 'Spend/Trip Uplift', value: `${slice.incremental_spend_lift}%` },
    { label: 'Budget Needed', value: formatIDR(Math.round(budget)) },
    { label: 'ROI', value: `${roiPos ? '+' : ''}${roi.toFixed(0)}%`, color: roiPos ? '#16a34a' : '#dc2626' },
  ];

  return (
    <div style={{ background: '#fafbfe', borderTop: '1px solid rgba(221,227,245,0.7)' }}>
      {/* 4-stat bar */}
      <div className="px-4 py-3 grid grid-cols-4 gap-0"
        style={{ borderBottom: '1px solid rgba(221,227,245,0.5)' }}>
        {summaryStats.map(({ label, value, color }) => (
          <div key={label} className="text-center px-2">
            <p className="text-xs" style={{ color: '#8894b4' }}>{label}</p>
            <p className="text-sm font-bold" style={{ color: color ?? '#07143a' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="px-4 pt-3 pb-1">
        <SLabel>Segment Insights</SLabel>
        <div className="mt-2">
          <SegmentInsights slice={slice} />
        </div>
      </div>

      {/* Tab switch */}
      <div className="px-4 pt-3 pb-0 flex gap-1">
        {(['mechanics', 'assumptions'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize"
            style={tab === t ? { background: '#07143a', color: '#fff' } : { background: 'rgba(0,0,0,0.04)', color: '#4a5578' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 pt-3">
        {tab === 'mechanics' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Campaign Type" value={slice.mechanics.campaign_type}
                onChange={e => onUpdate({ ...slice, mechanics: { ...slice.mechanics, campaign_type: e.target.value } })}
                options={CAMPAIGN_TYPES} />
              <Select label="Reward Type" value={slice.mechanics.reward_type}
                onChange={e => onUpdate({ ...slice, mechanics: { ...slice.mechanics, reward_type: e.target.value } })}
                options={REWARD_TYPES} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label={slice.mechanics.reward_type === 'cashback' || slice.mechanics.reward_type === 'xb_cashback' ? 'Rate (%)' : 'Value'}
                type="number" value={slice.mechanics.reward_value || ''}
                onChange={e => onUpdate({ ...slice, mechanics: { ...slice.mechanics, reward_value: Number(e.target.value) } })} />
              <div className="col-span-1">
                <Input
                  label="Threshold (IDR)"
                  type="number" value={slice.mechanics.spend_threshold || ''}
                  onChange={e => onUpdate({ ...slice, mechanics: { ...slice.mechanics, spend_threshold: Number(e.target.value) } })} />
                {slice.avg_spend_per_trip > 0 && (
                  <p className="text-xs mt-1 leading-tight" style={{ color: '#8894b4' }}>
                    Suggested: {formatIDR(suggestedThresh)} (20% above avg trip spend of {formatIDR(Math.round(slice.avg_spend_per_trip))})
                  </p>
                )}
              </div>
              <Input label="Cap (IDR, opt.)" type="number" value={slice.mechanics.reward_cap ?? ''}
                onChange={e => onUpdate({ ...slice, mechanics: { ...slice.mechanics, reward_cap: Number(e.target.value) || undefined } })} />
            </div>

            {isXb && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium" style={{ color: '#07143a' }}>Corridors</p>
                  <span className="text-xs" style={{ color: '#8894b4' }}>ALL = no restriction</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {/* ALL chip */}
                  {(() => {
                    const corridors = slice.mechanics.target_corridors ?? [];
                    const allSelected = corridors.length === 0;
                    return (
                      <button type="button"
                        onClick={() => onUpdate({ ...slice, mechanics: { ...slice.mechanics, target_corridors: [] } })}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                        style={allSelected
                          ? { background: '#07143a', color: '#fff' }
                          : { background: 'rgba(0,0,0,0.05)', color: '#4a5578' }}>
                        ALL
                      </button>
                    );
                  })()}
                  {ALL_CORRIDORS.slice(0, 12).map(c => {
                    const sel = (slice.mechanics.target_corridors ?? []).includes(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => {
                          const curr = slice.mechanics.target_corridors ?? [];
                          onUpdate({ ...slice, mechanics: { ...slice.mechanics, target_corridors: sel ? curr.filter(x => x !== c) : [...curr, c] } });
                        }}
                        className="px-2 py-1 rounded-full text-xs font-semibold transition-all"
                        style={sel ? { background: '#1434cb', color: '#fff' } : { background: 'rgba(0,0,0,0.05)', color: '#4a5578' }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'assumptions' && (
          <div className="space-y-3">
            <Slider label="Take-up Rate" value={slice.take_up_rate} min={1} max={50} step={1} suffix="%"
              hint="% of target audience expected to activate" color="#1434cb"
              onChange={v => onUpdate({ ...slice, take_up_rate: v })} />
            <Slider label="Incremental Spend Lift" value={slice.incremental_spend_lift} min={5} max={80} step={1} suffix="%"
              hint="Expected spend lift above organic baseline" color="#d97706"
              onChange={v => onUpdate({ ...slice, incremental_spend_lift: v })} />
            <Slider label="Control Group" value={slice.control_group_pct} min={5} max={30} step={1} suffix="%"
              color="#16a34a"
              onChange={v => onUpdate({ ...slice, control_group_pct: v })} />

            {/* Live ROI detail */}
            <div className="rounded-xl p-3 space-y-2"
              style={{
                background: roiPos ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)',
                border: `1px solid ${roiPos ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'}`,
              }}>
              <div className="flex items-center justify-between">
                <SLabel>Live ROI</SLabel>
                <span className="text-base font-bold" style={{ color: roiPos ? '#16a34a' : '#dc2626' }}>
                  {roiPos ? '+' : ''}{roi.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                {[
                  ['Reward / CH', formatIDR(Math.round(rewardPerCH))],
                  ['Budget Needed', formatIDR(Math.round(budget))],
                  ['Total Uplift', formatIDR(Math.round(totalUplift))],
                  ['Budget share', totalBudget > 0 ? `${((budget / totalBudget) * 100).toFixed(0)}%` : '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p style={{ color: '#8894b4' }}>{l}</p>
                    <p className="font-semibold" style={{ color: '#07143a' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex justify-end">
        <button type="button" onClick={onRemove}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
          style={{ color: '#dc2626', background: 'rgba(220,38,38,0.05)' }}>
          <Trash2 size={11} /> Remove segment
        </button>
      </div>
    </div>
  );
}

// ─── Segment card row ─────────────────────────────────────────────────────────

function SegmentCard({ slice, index, expanded, onToggle, onUpdate, onRemove, isXb, durationDays, totalBudget }:
  { slice: SegmentSlice; index: number; expanded: boolean; onToggle: () => void;
    onUpdate: (s: SegmentSlice) => void; onRemove: () => void; isXb: boolean;
    durationDays: number; totalBudget: number }) {
  const { budget, roi } = calcSliceROI(slice, durationDays);
  const roiPos = roi >= 0;

  return (
    <div className="rounded-2xl overflow-hidden transition-shadow"
      style={{
        border: expanded ? '1.5px solid rgba(20,52,203,0.25)' : '1px solid rgba(221,227,245,0.9)',
        background: '#fff',
        boxShadow: expanded ? '0 2px 12px rgba(20,52,203,0.08)' : '0 1px 4px rgba(7,20,58,0.03)',
      }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
        style={{ background: expanded ? 'rgba(20,52,203,0.02)' : 'transparent' }}>
        <div className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 text-xs font-bold"
          style={{ background: 'rgba(20,52,203,0.1)', color: '#1434cb' }}>{index + 1}</div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: '#07143a' }}>{slice.label}</p>
          <p className="text-xs mt-0.5" style={{ color: '#8894b4' }}>
            {formatCount(slice.audience_size)} CHs · {formatIDR(Math.round(slice.avg_monthly_spend))}/mo avg
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8894b4' }}>Budget</p>
            <p className="text-sm font-bold" style={{ color: '#07143a' }}>{formatIDR(Math.round(budget))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8894b4' }}>ROI</p>
            <p className="text-sm font-bold" style={{ color: roiPos ? '#16a34a' : '#dc2626' }}>
              {roiPos ? '+' : ''}{roi.toFixed(0)}%
            </p>
          </div>
          {expanded ? <ChevronUp size={14} style={{ color: '#8894b4' }} /> : <ChevronDown size={14} style={{ color: '#8894b4' }} />}
        </div>
      </button>
      {expanded && (
        <SegmentPanel slice={slice} onUpdate={onUpdate} onRemove={onRemove}
          isXb={isXb} durationDays={durationDays} totalBudget={totalBudget} />
      )}
    </div>
  );
}

// ─── Matrix heatmap ───────────────────────────────────────────────────────────

type CellData = { count: number; avgSpend: number; yoy: number };

function MatrixVisualizer({ dim1, dim2, matrix, maxCount, selectedCells, onToggleCell }:
  { dim1: DimDef; dim2: DimDef; matrix: Record<string, Record<string, CellData>>;
    maxCount: number; selectedCells: Set<string>; onToggleCell: (key: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid rgba(221,227,245,0.9)', background: '#fff' }}>
      <div className="p-4 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 size={13} style={{ color: '#1434cb' }} />
          <span className="text-xs font-semibold" style={{ color: '#07143a' }}>
            <span style={{ color: dim1.color }}>{dim1.shortLabel}</span>
            <span style={{ color: '#8894b4' }}> × </span>
            <span style={{ color: dim2.color }}>{dim2.shortLabel}</span>
          </span>
          <span className="text-xs ml-2" style={{ color: '#8894b4' }}>Click cells to include/exclude</span>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="pb-2 pr-2 text-left font-medium w-28" style={{ color: '#8894b4' }}>
                {dim1.shortLabel} \ {dim2.shortLabel}
              </th>
              {dim2.values.map(v2 => (
                <th key={v2} className="pb-2 px-1 text-center font-semibold" style={{ color: dim2.color, minWidth: 64 }}>
                  <span className="block truncate max-w-[72px] mx-auto" title={v2}>
                    {v2.length > 8 ? v2.slice(0, 7) + '…' : v2}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dim1.values.map(v1 => (
              <tr key={v1}>
                <td className="py-1 pr-2 font-semibold truncate max-w-[112px]" style={{ color: dim1.color }} title={v1}>
                  {v1.length > 12 ? v1.slice(0, 11) + '…' : v1}
                </td>
                {dim2.values.map(v2 => {
                  const cellKey = `${v1}||${v2}`;
                  const cell = matrix[v1]?.[v2];
                  if (!cell || cell.count === 0) {
                    return (
                      <td key={v2} className="py-1 px-1">
                        <div className="h-12 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                          <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: 10 }}>—</span>
                        </div>
                      </td>
                    );
                  }
                  const intensity = maxCount > 0 ? cell.count / maxCount : 0;
                  const sel = selectedCells.has(cellKey);
                  return (
                    <td key={v2} className="py-1 px-1">
                      <button type="button" onClick={() => onToggleCell(cellKey)}
                        className="w-full h-12 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                        title={`${v1} × ${v2}: ${formatCount(cell.count)} CHs`}
                        style={{
                          background: sel
                            ? `rgba(20,52,203,${0.12 + intensity * 0.45})`
                            : `rgba(20,52,203,${0.04 + intensity * 0.14})`,
                          border: sel ? '2px solid #1434cb' : '1px solid transparent',
                          boxShadow: sel ? '0 0 0 1px rgba(20,52,203,0.2)' : 'none',
                        }}>
                        <span className="font-bold" style={{ color: sel ? '#1434cb' : '#07143a', fontSize: 11 }}>
                          {formatCount(cell.count)}
                        </span>
                        <span style={{ color: sel ? '#4a6ff8' : '#8894b4', fontSize: 9 }}>
                          {cell.yoy >= 0 ? '+' : ''}{cell.yoy.toFixed(0)}%
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(221,227,245,0.5)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(20,52,203,0.06)' }} />
            <span className="text-xs" style={{ color: '#8894b4' }}>Low density</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(20,52,203,0.35)' }} />
            <span className="text-xs" style={{ color: '#8894b4' }}>High density</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(20,52,203,0.5)', border: '2px solid #1434cb' }} />
            <span className="text-xs" style={{ color: '#8894b4' }}>Selected</span>
          </div>
          <span className="text-xs ml-1" style={{ color: '#8894b4' }}>count · % = YoY</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step3AudienceMechanics({
  data, dataSource, chFilters, xbStats: xbStatsProp, durationDays, onChange, onNext, onBack,
}: Props) {
  const isXbIntel = dataSource === 'vif_xb_intelligence';

  const { cardholders, xbStats } = useMemo(() => {
    if (!isXbIntel) return { cardholders: [] as Cardholder[], xbStats: null };
    const chs = filterCardholders(chFilters ?? {});
    return { cardholders: chs, xbStats: xbStatsProp ?? computeSegmentStats(chs) };
  }, [isXbIntel, chFilters, xbStatsProp]);

  const [activeDims, setActiveDims] = useState<DimKey[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  const slices = data.slices;

  // ── Matrix computation ────────────────────────────────────────────────────

  const { dim1Def, dim2Def, matrix, maxCount } = useMemo(() => {
    if (activeDims.length < 2 || cardholders.length === 0) {
      return { dim1Def: null, dim2Def: null, matrix: {} as Record<string, Record<string, CellData>>, maxCount: 0 };
    }
    const d1 = DIMS.find(d => d.key === activeDims[0])!;
    const d2 = DIMS.find(d => d.key === activeDims[1])!;
    const m: Record<string, Record<string, CellData>> = {};
    let max = 0;
    d1.values.forEach(v1 => {
      m[v1] = {};
      d2.values.forEach(v2 => {
        const chs = cardholders.filter(ch => d1.filter(ch, v1) && d2.filter(ch, v2));
        const stats = chs.length > 0 ? computeSegmentStats(chs) : null;
        const count = chs.length;
        if (count > max) max = count;
        m[v1][v2] = { count, avgSpend: stats ? Math.round(stats.avgSpendXb / 12) : 0, yoy: stats?.avgYoY ?? 0 };
      });
    });
    return { dim1Def: d1, dim2Def: d2, matrix: m, maxCount: max };
  }, [activeDims, cardholders]);

  // Single-dim preview
  const singleDimSlices = useMemo(() => {
    if (activeDims.length !== 1 || cardholders.length === 0) return [];
    const d = DIMS.find(x => x.key === activeDims[0])!;
    const mechDefaults: Partial<SegmentMechanics> = {
      campaign_type: data.campaign_type || 'cross_border',
      reward_type: data.reward_type || 'xb_cashback',
      reward_value: data.reward_value || 5,
    };
    return d.values
      .map(v => {
        const chs = cardholders.filter(ch => d.filter(ch, v));
        if (chs.length === 0) return null;
        return sliceFromStats(v, computeSegmentStats(chs), v, '', mechDefaults);
      })
      .filter(Boolean) as SegmentSlice[];
  }, [activeDims, cardholders, data.campaign_type, data.reward_type, data.reward_value]);

  const toggleDim = useCallback((key: DimKey) => {
    setActiveDims(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
    setSelectedCells(new Set());
    onChange({ ...data, slices: [] });
  }, [data, onChange]);

  const toggleCell = useCallback((cellKey: string) => {
    setSelectedCells(prev => {
      const next = new Set(prev);
      next.has(cellKey) ? next.delete(cellKey) : next.add(cellKey);
      return next;
    });
  }, []);

  const applyMatrixSelection = useCallback(() => {
    if (!dim1Def || !dim2Def) return;
    const mechDefaults: Partial<SegmentMechanics> = {
      campaign_type: data.campaign_type || 'cross_border',
      reward_type: data.reward_type || 'xb_cashback',
      reward_value: data.reward_value || 5,
    };
    const newSlices: SegmentSlice[] = [];
    selectedCells.forEach(cellKey => {
      const [v1, v2] = cellKey.split('||');
      const chs = cardholders.filter(ch => dim1Def.filter(ch, v1) && dim2Def.filter(ch, v2));
      if (chs.length === 0) return;
      newSlices.push(sliceFromStats(`${v1} × ${v2}`, computeSegmentStats(chs), v1, v2, mechDefaults));
    });
    onChange({ ...data, slices: newSlices });
    setExpandedId(newSlices[0]?.id ?? null);
  }, [dim1Def, dim2Def, selectedCells, cardholders, data, onChange]);

  const applySingleDim = useCallback(() => {
    onChange({ ...data, slices: singleDimSlices });
    setExpandedId(singleDimSlices[0]?.id ?? null);
  }, [singleDimSlices, data, onChange]);

  function updateSlice(id: string, updated: SegmentSlice) {
    onChange({ ...data, slices: slices.map(s => s.id === id ? updated : s) });
  }
  function removeSlice(id: string) {
    onChange({ ...data, slices: slices.filter(s => s.id !== id) });
  }
  function addManual() {
    const s: SegmentSlice = {
      id: uid(), label: `Segment ${slices.length + 1}`,
      audience_size: 0, avg_monthly_spend: 0, avg_spend_per_trip: 0,
      avg_yoy: 0, active_traveller_pct: 0, top_corridor: '',
      segment_type: 'cross_border', mechanics: makeDefaultMechanics(),
      take_up_rate: 15, incremental_spend_lift: 20, control_group_pct: 15,
      dim1_value: '', dim2_value: '',
    };
    onChange({ ...data, slices: [...slices, s] });
    setExpandedId(s.id);
  }

  // Init default slice for non-XB
  if (slices.length === 0 && !isXbIntel && activeDims.length === 0) {
    const s: SegmentSlice = {
      id: uid(),
      label: data.segment_name || 'Segment',
      audience_size: data.audience_size || 0,
      avg_monthly_spend: data.avg_monthly_spend || 0,
      avg_spend_per_trip: 0, avg_yoy: 0, active_traveller_pct: 0, top_corridor: '',
      segment_type: data.segment_type || 'spend_stimulation',
      mechanics: makeDefaultMechanics({
        campaign_type: data.campaign_type,
        reward_type: data.reward_type,
        reward_value: data.reward_value || 5,
        spend_threshold: data.spend_threshold || 500000,
      }),
      take_up_rate: 15, incremental_spend_lift: 20, control_group_pct: 15,
      dim1_value: '', dim2_value: '',
    };
    setTimeout(() => { onChange({ ...data, slices: [s] }); setExpandedId(s.id); }, 0);
  }

  // Portfolio totals
  const totalBudget = slices.reduce((s, sl) => s + calcSliceROI(sl, durationDays).budget, 0);
  const totalActivated = slices.reduce((s, sl) => s + calcSliceROI(sl, durationDays).activated, 0);
  const totalUplift = slices.reduce((s, sl) => s + calcSliceROI(sl, durationDays).totalUplift, 0);
  const totalAudience = slices.reduce((s, sl) => s + sl.audience_size, 0) || (xbStats?.count ?? data.audience_size);
  const blendedRoi = totalBudget > 0 ? ((totalUplift - totalBudget) / totalBudget) * 100 : 0;
  const blendedPos = blendedRoi >= 0;
  const canContinue = slices.length > 0 && slices.every(s => s.audience_size > 0);
  const totalBaseAudience = isXbIntel && xbStats ? xbStats.count : data.audience_size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#8894b4' }}>Step 3</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#07143a' }}>Audience & Mechanics</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#4a5578', maxWidth: 560 }}>
          Select up to two dimensions to visualise your audience as a matrix. Click cells to create segments, then set mechanics and assumptions per segment.
        </p>
        {durationDays > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(20,52,203,0.07)', color: '#1434cb' }}>
            Campaign period: {durationDays} days
          </div>
        )}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>

        {/* ── LEFT ─────────────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Dimension selector */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.9)', boxShadow: '0 1px 6px rgba(7,20,58,0.03)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={14} style={{ color: '#1434cb' }} />
                <p className="text-sm font-semibold" style={{ color: '#07143a' }}>Breakdown Dimensions</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: activeDims.length === 2 ? 'rgba(20,52,203,0.1)' : 'rgba(0,0,0,0.05)',
                  color: activeDims.length === 2 ? '#1434cb' : '#8894b4',
                }}>
                {activeDims.length}/2 selected
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DIMS.map(dim => {
                const idx = activeDims.indexOf(dim.key);
                const active = idx >= 0;
                return (
                  <button key={dim.key} type="button" onClick={() => toggleDim(dim.key)}
                    className="relative text-left px-3 py-2.5 rounded-xl transition-all"
                    style={active
                      ? { background: `${dim.color}10`, border: `1.5px solid ${dim.color}`, boxShadow: `0 0 0 1px ${dim.color}20` }
                      : { background: '#fafbfe', border: '1.5px solid rgba(221,227,245,0.9)' }}>
                    {active && (
                      <span className="absolute top-1.5 right-2 w-4 h-4 flex items-center justify-center rounded-full font-bold"
                        style={{ background: dim.color, color: '#fff', fontSize: 9 }}>{idx + 1}</span>
                    )}
                    <p className="text-xs font-semibold pr-4" style={{ color: active ? dim.color : '#07143a' }}>{dim.label}</p>
                    <p className="text-xs mt-0.5 leading-tight" style={{ color: '#8894b4' }}>{dim.values.length} groups</p>
                  </button>
                );
              })}
            </div>

            {activeDims.length === 2 && dim1Def && dim2Def && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(20,52,203,0.04)', border: '1px solid rgba(20,52,203,0.1)' }}>
                <Zap size={11} style={{ color: '#1434cb' }} />
                <p className="text-xs" style={{ color: '#4a5578' }}>
                  <strong>{dim1Def.label}</strong> × <strong>{dim2Def.label}</strong> — up to {dim1Def.values.length * dim2Def.values.length} cells. Select the ones to target.
                </p>
              </div>
            )}
            {activeDims.length === 1 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(221,227,245,0.7)' }}>
                <Info size={11} style={{ color: '#8894b4' }} />
                <p className="text-xs" style={{ color: '#4a5578' }}>
                  Add a second dimension for a cross-dimensional matrix, or apply directly as a single-dimension split.
                </p>
              </div>
            )}
          </div>

          {/* Matrix (2 dims) */}
          {activeDims.length === 2 && dim1Def && dim2Def && Object.keys(matrix).length > 0 && (
            <div className="space-y-3">
              <MatrixVisualizer dim1={dim1Def} dim2={dim2Def} matrix={matrix}
                maxCount={maxCount} selectedCells={selectedCells} onToggleCell={toggleCell} />
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#8894b4' }}>
                  {selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => {
                      const all = new Set<string>();
                      dim1Def.values.forEach(v1 => dim2Def.values.forEach(v2 => {
                        if ((matrix[v1]?.[v2]?.count ?? 0) > 0) all.add(`${v1}||${v2}`);
                      }));
                      setSelectedCells(all);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(0,0,0,0.05)', color: '#4a5578' }}>
                    Select all
                  </button>
                  <button type="button" onClick={() => setSelectedCells(new Set())}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(0,0,0,0.05)', color: '#4a5578' }}>
                    Clear
                  </button>
                  <Button size="sm" onClick={applyMatrixSelection} disabled={selectedCells.size === 0}
                    icon={<CheckCircle2 size={13} />}>
                    Apply {selectedCells.size > 0 ? `(${selectedCells.size})` : ''} segments
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Single dim preview */}
          {activeDims.length === 1 && singleDimSlices.length > 0 && slices.length === 0 && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.9)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
                  {singleDimSlices.length} segments preview
                </p>
                <Button size="sm" onClick={applySingleDim} icon={<CheckCircle2 size={13} />}>Apply segments</Button>
              </div>
              <div className="space-y-1.5">
                {singleDimSlices.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(20,52,203,0.03)' }}>
                    <p className="text-xs font-semibold flex-1 truncate" style={{ color: '#07143a' }}>{s.label}</p>
                    <p className="text-xs font-medium flex-shrink-0" style={{ color: '#1434cb' }}>{formatCount(s.audience_size)}</p>
                    <p className="text-xs flex-shrink-0" style={{ color: '#8894b4' }}>{formatIDR(s.avg_monthly_spend)}/mo</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Divider />

          {/* Segment cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={13} style={{ color: '#8894b4' }} />
                <SLabel>{slices.length} Segment{slices.length !== 1 ? 's' : ''} Configured</SLabel>
              </div>
              <button type="button" onClick={addManual}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(20,52,203,0.06)', color: '#1434cb' }}>
                <Plus size={11} /> Add manually
              </button>
            </div>

            {slices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl"
                style={{ border: '2px dashed rgba(221,227,245,0.9)', background: '#fafbfe' }}>
                <Grid3X3 size={24} className="mb-2" style={{ color: '#c7d0e8' }} />
                <p className="text-sm font-medium" style={{ color: '#8894b4' }}>
                  {activeDims.length === 0
                    ? 'Select dimensions above to start building segments'
                    : activeDims.length === 1
                    ? 'Click "Apply segments" to generate from your selection'
                    : 'Select cells in the matrix and click "Apply segments"'}
                </p>
              </div>
            ) : (
              slices.map((slice, i) => (
                <SegmentCard key={slice.id} slice={slice} index={i}
                  expanded={expandedId === slice.id}
                  onToggle={() => setExpandedId(expandedId === slice.id ? null : slice.id)}
                  onUpdate={updated => updateSlice(slice.id, updated)}
                  onRemove={() => removeSlice(slice.id)}
                  isXb={isXbIntel}
                  durationDays={durationDays}
                  totalBudget={totalBudget}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Portfolio summary ──────────────────────────────────────── */}
        <div>
          <div className="rounded-2xl p-4 space-y-4 sticky top-24"
            style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.9)', boxShadow: '0 2px 12px rgba(7,20,58,0.04)' }}>

            <p className="text-sm font-semibold" style={{ color: '#07143a' }}>Campaign Portfolio</p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl p-3" style={{ background: 'rgba(20,52,203,0.04)' }}>
                <div className="flex items-center gap-1 mb-1">
                  <Users size={10} style={{ color: '#1434cb' }} />
                  <p className="text-xs" style={{ color: '#6b7eb8' }}>Audience</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#07143a' }}>{formatCount(totalAudience)}</p>
                <p className="text-xs" style={{ color: '#8894b4' }}>{slices.length} segment{slices.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(217,119,6,0.04)' }}>
                <div className="flex items-center gap-1 mb-1">
                  <Target size={10} style={{ color: '#d97706' }} />
                  <p className="text-xs" style={{ color: '#6b7eb8' }}>Spend Uplift</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#07143a' }}>{formatIDR(Math.round(totalUplift))}</p>
                <p className="text-xs" style={{ color: '#8894b4' }}>incremental total</p>
              </div>
            </div>

            <Divider />

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <DollarSign size={11} style={{ color: '#8894b4' }} />
                <SLabel>Budget Needed</SLabel>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#07143a' }}>{formatIDR(Math.round(totalBudget))}</p>
              {slices.length > 1 && (
                <div className="mt-2 space-y-1.5">
                  {slices.map((s, i) => {
                    const { budget } = calcSliceROI(s, durationDays);
                    const pct = totalBudget > 0 ? (budget / totalBudget) * 100 : 0;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                          style={{ background: 'rgba(20,52,203,0.08)', color: '#1434cb', fontSize: 9 }}>{i + 1}</span>
                        <p className="text-xs flex-1 truncate" style={{ color: '#4a5578' }}>{s.label}</p>
                        <div className="w-12 h-1 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(0,0,0,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#1434cb' }} />
                        </div>
                        <p className="text-xs font-semibold flex-shrink-0 w-20 text-right tabular-nums" style={{ color: '#07143a' }}>
                          {formatIDR(Math.round(budget))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Divider />

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={11} style={{ color: '#8894b4' }} />
                <SLabel>Blended ROI</SLabel>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold" style={{ color: blendedPos ? '#16a34a' : '#dc2626' }}>
                  {blendedPos ? '+' : ''}{blendedRoi.toFixed(0)}%
                </p>
                <p className="text-xs" style={{ color: '#8894b4' }}>budget-weighted</p>
              </div>
              {slices.length > 1 && (
                <div className="mt-2 space-y-1.5">
                  {slices.map((s, i) => {
                    const { roi } = calcSliceROI(s, durationDays);
                    const pos = roi >= 0;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                          style={{ background: 'rgba(20,52,203,0.08)', color: '#1434cb', fontSize: 9 }}>{i + 1}</span>
                        <p className="text-xs flex-1 truncate" style={{ color: '#4a5578' }}>{s.label}</p>
                        <p className="text-xs font-semibold flex-shrink-0" style={{ color: pos ? '#16a34a' : '#dc2626' }}>
                          {pos ? '+' : ''}{roi.toFixed(0)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isXbIntel && xbStats && xbStats.top3Corridors.length > 0 && (
              <>
                <Divider />
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin size={11} style={{ color: '#8894b4' }} />
                    <SLabel>Top Corridors</SLabel>
                  </div>
                  <div className="space-y-1.5">
                    {xbStats.top3Corridors.map(({ code, sharePct }, i) => (
                      <div key={code} className="flex items-center gap-2">
                        <span className="text-xs w-4" style={{ color: '#8894b4' }}>#{i + 1}</span>
                        <span className="text-xs font-semibold flex-1" style={{ color: i === 0 ? '#1434cb' : '#07143a' }}>{code}</span>
                        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, sharePct * 1.5)}%`, background: i === 0 ? '#1434cb' : '#8894b4' }} />
                        </div>
                        <span className="text-xs w-8 text-right tabular-nums" style={{ color: '#8894b4' }}>{sharePct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!canContinue && slices.length > 0 && (
              <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                <p className="text-xs" style={{ color: '#d97706' }}>Set audience size for all segments to continue.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Divider />
      <div className="flex justify-between">
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack}>Back</Button>
        <Button icon={<ArrowRight size={15} />} onClick={onNext} disabled={!canContinue}>
          Continue to Assumptions
        </Button>
      </div>
    </div>
  );
}
