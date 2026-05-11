'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import Button from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Upload, CircleCheck as CheckCircle2, Lock, Filter, Users, ChevronDown, ChevronUp, Plane, CreditCard, ChartBar as BarChart2, Sparkles, Shield, UserPlus, TrendingUp, TrendingDown, Mail, X, TriangleAlert as AlertTriangle, FileText, Download, RefreshCw, Trash2, Link2, Database, Layers } from 'lucide-react';
import { VifSegment } from '@/lib/vif-mock-data';
import { supabase, UploadedCsvFile } from '@/lib/supabase';
import {
  filterCardholders, computeSegmentStats, CardholderFilter,
  ALL_TIERS, ALL_DFMC, ALL_AFFLUENT,
  CardTier, DfmcSegment, AffluentPersona,
  CARDHOLDER_DATASET,
  generateSampleCsvText,
  SAMPLE_CSV_TOTAL, SAMPLE_CSV_MATCHED, SAMPLE_CSV_UNMATCHED,
} from '@/lib/cardholder-data';
import { formatIDR, formatCount } from '@/lib/utils';

export type BankDataFilters = {
  // numeric range sliders — [min, max]
  credit_limit_range?: [number, number];
  remaining_limit_range?: [number, number];
  utilisation_range?: [number, number];   // 0–100 %
  // categorical
  card_status?: 'active_only' | 'all';
  consent_only?: boolean;
};

export type Step2Data = {
  data_source: 'manual' | 'vif_xb' | 'vif_spend_stimulation' | 'csv_upload' | 'vif_xb_intelligence';
  selected_vif_segment?: VifSegment;
  csv_filename?: string;
  csv_file_id?: string;
  csv_has_consent?: boolean;
  csv_has_card_status?: boolean;
  csv_row_count?: number;
  csv_match_pct?: number;
  csv_matched?: number;
  csv_unmatched?: number;
  ch_filters?: CardholderFilter;
  // Combined VIF + Bank data enrichment
  enriched_csv_filename?: string;
  enriched_csv_file_id?: string;
  enriched_csv_has_consent?: boolean;
  enriched_csv_has_card_status?: boolean;
  enriched_csv_row_count?: number;
  enriched_csv_match_pct?: number;
  enriched_csv_matched?: number;
  enriched_csv_unmatched?: number;
  enriched_csv_columns?: string[];
  bank_data_enabled?: boolean;
  bank_data_filters?: BankDataFilters;
};

interface Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

// ── Multi-select pill toggle ──────────────────────────────────────────────────
function PillFilter<T extends string>({
  label, all, selected, onChange, color = '#1434cb',
}: {
  label: string;
  all: readonly T[];
  selected: T[];
  onChange: (v: T[]) => void;
  color?: string;
}) {
  const isAll = selected.length === 0;
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: '#8894b4' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={isAll ? { background: '#07143a', color: '#fff' } : { background: 'rgba(0,0,0,0.04)', color: '#4a5578' }}
        >
          All
        </button>
        {all.map((v) => {
          const active = selected.includes(v);
          return (
            <button key={v} type="button" onClick={() => toggle(v)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={active ? { background: color, color: '#fff' } : { background: 'rgba(0,0,0,0.04)', color: '#4a5578' }}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Decile picker ─────────────────────────────────────────────────────────────
const DECILE_DESCRIPTORS: Record<number, { short: string }> = {
  1: { short: 'All' }, 2: { short: 'Low' }, 3: { short: 'Low' }, 4: { short: 'Low' },
  5: { short: 'Mid' }, 6: { short: 'Mid' }, 7: { short: 'High' }, 8: { short: 'High' },
  9: { short: 'Top' }, 10: { short: 'Best' },
};

function DecileSlider({ label, value, onChange, disabled = false }: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  const desc = DECILE_DESCRIPTORS[value];
  return (
    <div className="space-y-2" style={{ opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: '#4a5578' }}>{label}</p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: value === 1 ? 'rgba(0,0,0,0.05)' : 'rgba(20,52,203,0.1)', color: value === 1 ? '#8894b4' : '#1434cb' }}>
          {value === 1 ? 'No minimum' : `D${value}+`}
          {value > 1 && <span className="font-normal ml-1" style={{ color: '#8894b4' }}>{desc.short}</span>}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => {
          const isActive = d >= value;
          const isSelected = d === value;
          const blockAlpha = isActive ? 0.12 + (d / 10) * 0.7 : 0;
          return (
            <button key={d} type="button" onClick={() => onChange(d === value ? 1 : d)}
              title={d === 1 ? 'No minimum' : `Minimum decile ${d}`}
              className="relative flex-1 transition-all" style={{ height: 30 }}>
              <div className="w-full rounded-sm transition-all"
                style={{
                  height: `${50 + d * 5}%`,
                  background: isActive ? `rgba(20, 52, 203, ${blockAlpha})` : 'rgba(0,0,0,0.06)',
                  outline: isSelected ? '2px solid #1434cb' : 'none',
                  outlineOffset: '1px',
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                }} />
              <span className="absolute -bottom-4 left-0 right-0 text-center transition-all"
                style={{ fontSize: '9px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1434cb' : '#8894b4' }}>
                {d}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-5 flex items-end justify-between">
        <span className="text-xs" style={{ color: '#8894b4', fontSize: '10px' }}>Low propensity</span>
        <span className="text-xs" style={{ color: '#8894b4', fontSize: '10px' }}>Highest propensity</span>
      </div>
    </div>
  );
}

// ── Live audience side panel (sticky, side-by-side with filters) ─────────────
export function LiveAudienceFloatingPanel({
  filters,
  activeFilterCount,
  bankEnabled,
  bankFilters,
}: {
  filters: CardholderFilter;
  activeFilterCount: number;
  bankEnabled?: boolean;
  bankFilters?: BankDataFilters;
}) {
  const [pulse, setPulse] = useState(false);

  const baseStats = useMemo(() => {
    const matched = filterCardholders(filters);
    return computeSegmentStats(matched);
  }, [filters]);

  // Synthetic bank-filter impact: narrows the count and shifts spend averages.
  // Credit-limit / remaining-limit bands 0–500M, utilisation 0–100%.
  const stats = useMemo(() => {
    if (!bankEnabled || !bankFilters) return baseStats;
    let countMult = 1;
    let spendMult = 1;
    const clampSpan = (rng: [number, number], full: number) => Math.max(0, Math.min(1, (rng[1] - rng[0]) / full));

    if (bankFilters.credit_limit_range) {
      const span = clampSpan(bankFilters.credit_limit_range, 500);
      const mid = (bankFilters.credit_limit_range[0] + bankFilters.credit_limit_range[1]) / 2;
      countMult *= Math.max(0.02, span);
      spendMult *= 0.6 + (mid / 500) * 0.9;
    }
    if (bankFilters.remaining_limit_range) {
      const span = clampSpan(bankFilters.remaining_limit_range, 500);
      countMult *= Math.max(0.05, span);
    }
    if (bankFilters.utilisation_range) {
      const span = clampSpan(bankFilters.utilisation_range, 100);
      const mid = (bankFilters.utilisation_range[0] + bankFilters.utilisation_range[1]) / 2;
      countMult *= Math.max(0.05, span);
      spendMult *= 0.85 + (mid / 100) * 0.3;
    }
    if (bankFilters.card_status === 'active_only') countMult *= 0.92;
    if (bankFilters.consent_only) countMult *= 0.82;

    return {
      ...baseStats,
      count: Math.round(baseStats.count * countMult),
      avgSpendXb: Math.round(baseStats.avgSpendXb * spendMult),
      avgSpendPerTrip: Math.round(baseStats.avgSpendPerTrip * spendMult),
    };
  }, [baseStats, bankEnabled, bankFilters]);

  const totalPool = useMemo(() => CARDHOLDER_DATASET.length, []);
  const reductionPct = totalPool > 0 ? Math.round((stats.count / totalPool) * 100) : 0;

  const totalUplift = stats.count > 0 ? Math.round(stats.count * stats.avgSpendPerTrip * 0.15 * 0.20) : 0;
  const upliftPerChTrip = Math.round(stats.avgSpendPerTrip * 0.20);

  // Pulse when stats change
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [stats.count, stats.avgSpendXb, stats.avgSpendPerTrip]);

  const isEmpty = stats.count === 0;
  const primary = isEmpty ? '#dc2626' : '#1434cb';
  const headerGradient = isEmpty
    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
    : 'linear-gradient(135deg, #eff6ff 0%, #e8f0fe 100%)';

  return (
    <div
      className="sticky flex flex-col rounded-2xl overflow-hidden"
      style={{
        top: 88,
        maxHeight: 'calc(100vh - 120px)',
        background: '#fff',
        border: '1px solid rgba(221,227,245,0.8)',
        boxShadow: '0 8px 24px rgba(7,20,58,0.08), 0 1px 4px rgba(7,20,58,0.04)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 flex-shrink-0" style={{ background: headerGradient, borderBottom: `1px solid ${isEmpty ? 'rgba(220,38,38,0.1)' : 'rgba(20,52,203,0.1)'}` }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: primary }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: primary }} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: primary, letterSpacing: '0.12em', fontSize: 10 }}>Live Audience</span>
          </div>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: primary, color: '#fff', fontSize: 9 }}>
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
        </div>

        {/* Count */}
        <div className="flex items-baseline gap-2">
          <Users size={18} style={{ color: primary, transform: 'translateY(2px)' }} />
          <span className="text-2xl font-bold leading-none" style={{ color: isEmpty ? '#dc2626' : '#07143a', transition: 'color 0.2s' }}>
            {formatCount(stats.count)}
          </span>
          <span className="text-xs font-medium" style={{ color: '#4a5578' }}>cardholders</span>
        </div>

        {!isEmpty && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: '#6b7eb8', fontSize: 10 }}>of {formatCount(totalPool)} total</span>
              <span className="text-xs font-semibold" style={{ color: primary, fontSize: 10 }}>{reductionPct}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(20,52,203,0.12)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(2, reductionPct)}%`, background: primary }} />
            </div>
          </div>
        )}

        {isEmpty && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: '#dc2626' }}>
            No cardholders match these filters. Try loosening a few to grow the pool.
          </p>
        )}
      </div>

      {/* Body */}
      {!isEmpty && (
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Spend metrics */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#8894b4', letterSpacing: '0.1em', fontSize: 10 }}>Spend Profile</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#6b7eb8', fontSize: 10 }}>Avg XB / yr</p>
                <p className="text-sm font-bold" style={{ color: '#07143a' }}>{formatIDR(stats.avgSpendXb)}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {stats.avgYoY >= 0 ? <TrendingUp size={9} style={{ color: '#16a34a' }} /> : <TrendingDown size={9} style={{ color: '#dc2626' }} />}
                  <span className="text-xs font-medium" style={{ color: stats.avgYoY >= 0 ? '#16a34a' : '#dc2626', fontSize: 10 }}>
                    {stats.avgYoY >= 0 ? '+' : ''}{stats.avgYoY}% YoY
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#6b7eb8', fontSize: 10 }}>Avg / trip</p>
                <p className="text-sm font-bold" style={{ color: '#07143a' }}>{formatIDR(stats.avgSpendPerTrip)}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {stats.avgSpendPerTripYoY >= 0 ? <TrendingUp size={9} style={{ color: '#16a34a' }} /> : <TrendingDown size={9} style={{ color: '#dc2626' }} />}
                  <span className="text-xs font-medium" style={{ color: stats.avgSpendPerTripYoY >= 0 ? '#16a34a' : '#dc2626', fontSize: 10 }}>
                    {stats.avgSpendPerTripYoY >= 0 ? '+' : ''}{stats.avgSpendPerTripYoY}% YoY
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(221,227,245,0.7)' }} />

          {/* Projected uplift */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#8894b4', letterSpacing: '0.1em', fontSize: 10 }}>Projected Uplift</p>
            <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #1434cb 0%, #2050e5 100%)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>Est. Total Campaign Uplift</p>
              <p className="text-xl font-bold text-white leading-tight">{formatIDR(totalUplift)}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>Audience × spend/trip × 15% × 20%</p>
            </div>
            <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(20,52,203,0.05)', border: '1px solid rgba(20,52,203,0.1)' }}>
              <div className="flex items-baseline justify-between">
                <p className="text-xs" style={{ color: '#6b7eb8', fontSize: 10 }}>Per cardholder / trip</p>
                <p className="text-sm font-bold" style={{ color: '#1434cb' }}>{formatIDR(upliftPerChTrip)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── XB Intelligence filter panel ─────────────────────────────────────────────
function XbIntelligencePanel({ filters, onChange }: { filters: CardholderFilter; onChange: (f: CardholderFilter) => void }) {
  const hasActiveFilters = Object.keys(filters).some(k => {
    const val = filters[k as keyof CardholderFilter];
    return Array.isArray(val) ? val.length > 0 : val !== undefined && val !== 1;
  });

  return (
    <div className="space-y-0">
      {/* ── Filter sections ── */}
      <div className="space-y-6">

        {/* Card Profile */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={13} style={{ color: '#1434cb' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>Card Profile</p>
          </div>
          <div className="space-y-4">
            <PillFilter label="Card Tier" all={ALL_TIERS} selected={filters.card_tiers ?? []} onChange={(v) => onChange({ ...filters, card_tiers: v as CardTier[] })} />
            <PillFilter label="Affluence Tier" all={ALL_AFFLUENT} selected={filters.affluent_personas ?? []} onChange={(v) => onChange({ ...filters, affluent_personas: v as AffluentPersona[] })} color="#d97706" />
            <PillFilter label="DFMC Segment" all={ALL_DFMC} selected={filters.dfmc_segments ?? []} onChange={(v) => onChange({ ...filters, dfmc_segments: v as DfmcSegment[] })} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(221,227,245,0.8)' }} />

        {/* Travel Intelligence */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Plane size={13} style={{ color: '#1434cb' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>Travel Intelligence</p>
          </div>

          {(() => {
            const travelStatus = filters.travel_status ?? [];
            const onlyActive = travelStatus.length === 1 && travelStatus[0] === 'Active Traveller';
            const onlyInactive = travelStatus.length === 1 && travelStatus[0] === 'Non-Active Traveller';

            function handleTravelStatusChange(v: ('Active Traveller' | 'Non-Active Traveller')[]) {
              const next: CardholderFilter = { ...filters, travel_status: v };
              if (v.length === 1 && v[0] === 'Active Traveller') next.min_inactive_decile = 1;
              else if (v.length === 1 && v[0] === 'Non-Active Traveller') next.min_active_decile = 1;
              onChange(next);
            }

            return (
              <div className="space-y-5">
                <PillFilter
                  label="Travel Status"
                  all={['Active Traveller', 'Non-Active Traveller'] as const}
                  selected={travelStatus}
                  onChange={(v) => handleTravelStatusChange(v as ('Active Traveller' | 'Non-Active Traveller')[])}
                />

                <div className="space-y-5">
                  <div style={{ opacity: onlyInactive ? 0.35 : 1, pointerEvents: onlyInactive ? 'none' : 'auto' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: onlyInactive ? '#dde3f5' : '#1434cb' }} />
                      <p className="text-xs font-medium" style={{ color: onlyInactive ? '#8894b4' : '#4a5578' }}>Active Traveller Propensity</p>
                      {onlyInactive && <span className="text-xs" style={{ color: '#8894b4' }}>N/A</span>}
                    </div>
                    <DecileSlider label="" value={filters.min_active_decile ?? 1} onChange={(v) => onChange({ ...filters, min_active_decile: v })} disabled={onlyInactive} />
                  </div>

                  <div style={{ opacity: onlyActive ? 0.35 : 1, pointerEvents: onlyActive ? 'none' : 'auto' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: onlyActive ? '#dde3f5' : '#8894b4' }} />
                      <p className="text-xs font-medium" style={{ color: onlyActive ? '#8894b4' : '#4a5578' }}>Non-Active Traveller Propensity</p>
                      {onlyActive && <span className="text-xs" style={{ color: '#8894b4' }}>N/A</span>}
                    </div>
                    <DecileSlider label="" value={filters.min_inactive_decile ?? 1} onChange={(v) => onChange({ ...filters, min_inactive_decile: v })} disabled={onlyActive} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {hasActiveFilters && (
          <button type="button" onClick={() => onChange({})} className="text-xs font-medium" style={{ color: '#dc2626' }}>
            Reset all filters
          </button>
        )}
      </div>
    </div>
  );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────────────

function parseCsv(text: string): { columns: string[]; rowCount: number; hashes: string[] } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { columns: [], rowCount: 0, hashes: [] };
  const columns = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const hashIdx = columns.indexOf('card_hash_sha256');
  const hashes = hashIdx >= 0
    ? lines.slice(1).map((l) => l.split(',')[hashIdx]?.trim().replace(/^"|"$/g, '') ?? '')
    : [];
  return { columns, rowCount: lines.length - 1, hashes };
}

function computeMatchResult(uploadedHashes: string[]): { matched: number; unmatched: number; matchPct: number; unmatchedHashes: string[] } {
  const knownSet = new Set(CARDHOLDER_DATASET.map((c) => c.card_hash_sha256));
  const unmatchedHashes: string[] = [];
  let matched = 0;
  for (const h of uploadedHashes) {
    if (knownSet.has(h)) matched++;
    else unmatchedHashes.push(h);
  }
  const total = uploadedHashes.length;
  const matchPct = total > 0 ? parseFloat(((matched / total) * 100).toFixed(1)) : 0;
  return { matched, unmatched: unmatchedHashes.length, matchPct, unmatchedHashes };
}

// ── Match summary sub-component ───────────────────────────────────────────────
function MatchSummary({ matched, unmatched, matchPct, unmatchedHashes, showUnmatched }: {
  matched: number; unmatched: number; matchPct: number; unmatchedHashes: string[]; showUnmatched?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const matchColor = matchPct >= 80 ? '#16a34a' : matchPct >= 50 ? '#d97706' : '#dc2626';
  const unmatchColor = '#dc2626';
  const barW = Math.round(matchPct);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(221,227,245,0.8)' }}>
      {/* Match bar header */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: '#07143a' }}>VIF dataset match</p>
          <span className="text-sm font-bold" style={{ color: matchColor }}>{matchPct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(220,38,38,0.12)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: matchColor }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-medium" style={{ color: matchColor }}>
            {formatCount(matched)} matched
          </span>
          <span className="text-xs font-medium" style={{ color: unmatched > 0 ? unmatchColor : '#8894b4' }}>
            {formatCount(unmatched)} unmatched
          </span>
        </div>
      </div>

      {/* Unmatched detail */}
      {showUnmatched !== false && unmatched > 0 && (
        <>
          <div style={{ height: '1px', background: 'rgba(221,227,245,0.8)' }} />
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-3.5 py-2 transition-colors hover:bg-gray-50"
          >
            <span className="text-xs font-medium" style={{ color: '#dc2626' }}>
              View {unmatched} unmatched hash{unmatched !== 1 ? 'es' : ''}
            </span>
            <ChevronDown size={11} style={{ color: '#dc2626', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {expanded && (
            <div className="px-3.5 pb-3 space-y-1.5" style={{ background: 'rgba(220,38,38,0.02)' }}>
              <p className="text-xs mb-2" style={{ color: '#8894b4' }}>
                These hashes were not found in the VIF cardholder dataset. They may be new cardholders, data quality issues, or cards outside the current data snapshot.
              </p>
              {unmatchedHashes.slice(0, 10).map((h, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.1)' }}>
                  <X size={9} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span className="font-mono text-xs truncate" style={{ color: '#7f1d1d', fontSize: '10px' }}>{h}</span>
                </div>
              ))}
              {unmatchedHashes.length > 10 && (
                <p className="text-xs" style={{ color: '#b0bdd6' }}>+{unmatchedHashes.length - 10} more unmatched hashes not shown</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CsvUploadModalProps {
  onClose: () => void;
  onSelect: (file: { id: string; filename: string; rowCount: number; hasConsent: boolean; hasCardStatus: boolean; matchPct: number; matched: number; unmatched: number }) => void;
  issuerId: string | null;
}

function CsvUploadModal({ onClose, onSelect, issuerId }: CsvUploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'upload' | 'existing'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [existingFiles, setExistingFiles] = useState<UploadedCsvFile[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    filename: string; columns: string[]; rowCount: number;
    matched: number; unmatched: number; matchPct: number; unmatchedHashes: string[];
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (tab === 'existing') loadExisting();
  }, [tab]);

  async function loadExisting() {
    setLoadingExisting(true);
    const { data } = await supabase.from('uploaded_csv_files').select('*').order('uploaded_at', { ascending: false });
    const rows = (data as UploadedCsvFile[]) ?? [];
    const hasSample = rows.some((r) => r.filename === 'sample_segment.csv');
    if (!hasSample) {
      rows.push({
        id: 'sample-builtin',
        issuer_id: '',
        filename: 'sample_segment.csv',
        row_count: SAMPLE_CSV_TOTAL,
        columns: ['card_hash_sha256', 'credit_limit', 'remaining_limit', 'utilisation_pct', 'consent_flag', 'card_status'],
        has_consent_flag: true,
        has_card_status: true,
        storage_path: 'segments/sample_segment.csv',
        uploaded_at: new Date().toISOString(),
        matched_count: SAMPLE_CSV_MATCHED,
        unmatched_count: SAMPLE_CSV_UNMATCHED,
        match_pct: 95.0,
        unmatched_hashes: Array.from({ length: Math.min(SAMPLE_CSV_UNMATCHED, 5) }, (_, i) =>
          'deadbeef' + String(i).padStart(56, '0')
        ),
      });
    }
    setExistingFiles(rows);
    setLoadingExisting(false);
  }

  function handleFileChosen(file: File) {
    setUploadError(null);
    setParsedPreview(null);
    setPendingFile(null);
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only CSV files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { columns, rowCount, hashes } = parseCsv(text);
      if (!columns.includes('card_hash_sha256')) {
        setUploadError('Missing required column: card_hash_sha256. Do not upload raw card numbers — use SHA-256 hashes only.');
        return;
      }
      const match = computeMatchResult(hashes);
      setParsedPreview({ filename: file.name, columns, rowCount, ...match });
      setPendingFile(file);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!pendingFile || !parsedPreview) return;
    setUploading(true);
    setUploadError(null);
    try {
      const text = await pendingFile.text();
      const { columns, rowCount, hashes } = parseCsv(text);
      const hasConsent = columns.includes('consent_flag');
      const hasCardStatus = columns.includes('card_status');
      const match = computeMatchResult(hashes);

      const { data, error } = await supabase.from('uploaded_csv_files').insert({
        issuer_id: issuerId ?? '00000000-0000-0000-0000-000000000000',
        filename: pendingFile.name,
        row_count: rowCount,
        columns,
        has_consent_flag: hasConsent,
        has_card_status: hasCardStatus,
        storage_path: `segments/${pendingFile.name}`,
        matched_count: match.matched,
        unmatched_count: match.unmatched,
        match_pct: match.matchPct,
        unmatched_hashes: match.unmatchedHashes,
      }).select().maybeSingle();

      if (error) throw new Error(error.message);
      const saved = data as UploadedCsvFile;
      onSelect({
        id: saved.id, filename: saved.filename, rowCount: saved.row_count,
        hasConsent: saved.has_consent_flag, hasCardStatus: saved.has_card_status,
        matchPct: saved.match_pct, matched: saved.matched_count, unmatched: saved.unmatched_count,
      });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(7,20,58,0.4)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl w-full mx-4 flex flex-col"
        style={{ maxWidth: 480, maxHeight: '90vh', background: '#fff', boxShadow: '0 24px 64px rgba(7,20,58,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(221,227,245,0.8)' }}>
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X size={14} style={{ color: '#8894b4' }} />
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>Card-Level Segment Data</p>
          <h3 className="text-base font-bold" style={{ color: '#07143a' }}>Upload or select a segment file</h3>
        </div>

        {/* SHA-256 security notice */}
        <div className="mx-6 mt-4 px-3.5 py-3 rounded-xl flex items-start gap-2.5 flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#dc2626' }}>Do not upload raw card numbers</p>
            <p className="text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>
              All card identifiers must be hashed using <strong>SHA-256</strong> before upload.
              Raw PANs (Primary Account Numbers) are strictly prohibited and will be rejected.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mt-4 rounded-lg p-0.5 flex-shrink-0" style={{ background: 'rgba(221,227,245,0.4)' }}>
          {(['upload', 'existing'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={tab === t
                ? { background: '#fff', color: '#07143a', boxShadow: '0 1px 4px rgba(7,20,58,0.08)' }
                : { color: '#8894b4' }}>
              {t === 'upload' ? 'Upload new file' : 'Use existing file'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {tab === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? '#1434cb' : 'rgba(221,227,245,0.9)',
                  background: dragOver ? 'rgba(20,52,203,0.03)' : '#fafbff',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileChosen(f); }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(20,52,203,0.08)' }}>
                  <Upload size={18} style={{ color: '#1434cb' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#07143a' }}>Drop your CSV here</p>
                <p className="text-xs" style={{ color: '#8894b4' }}>or click to browse</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }} />
              </div>

              {/* Generate & download sample */}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={generatingSample}
                  onClick={() => {
                    setGeneratingSample(true);
                    // Yield to browser to render disabled state before heavy work
                    setTimeout(() => {
                      const csv = generateSampleCsvText();
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sample_segment.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                      setGeneratingSample(false);
                    }, 10);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: '#8894b4' }}
                >
                  {generatingSample
                    ? <div style={{ width: 11, height: 11, border: '1.5px solid #c0c8dc', borderTopColor: '#8894b4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    : <Download size={11} />
                  }
                  {generatingSample ? `Generating ${formatCount(SAMPLE_CSV_TOTAL)} rows…` : 'Download sample CSV'}
                </button>
              </div>

              {/* Parse + match preview */}
              {parsedPreview && (
                <div className="space-y-3">
                  {/* File info */}
                  <div className="rounded-xl p-3.5" style={{ background: '#f7f9fc', border: '1px solid rgba(221,227,245,0.8)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={13} style={{ color: '#1434cb' }} />
                      <p className="text-xs font-semibold flex-1 truncate" style={{ color: '#07143a' }}>{parsedPreview.filename}</p>
                      <span className="text-xs" style={{ color: '#8894b4' }}>{formatCount(parsedPreview.rowCount)} rows</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parsedPreview.columns.map((col) => (
                        <span key={col} className="px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'rgba(20,52,203,0.06)', color: '#1434cb', fontSize: '10px' }}>
                          {col}
                        </span>
                      ))}
                    </div>
                    {(parsedPreview.columns.includes('consent_flag') || parsedPreview.columns.includes('card_status')) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {parsedPreview.columns.includes('consent_flag') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '10px' }}>
                            <CheckCircle2 size={9} /> Consent flag — applied at segmentation
                          </span>
                        )}
                        {parsedPreview.columns.includes('card_status') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '10px' }}>
                            <CheckCircle2 size={9} /> Card status — applied at segmentation
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Match summary */}
                  <MatchSummary
                    matched={parsedPreview.matched}
                    unmatched={parsedPreview.unmatched}
                    matchPct={parsedPreview.matchPct}
                    unmatchedHashes={parsedPreview.unmatchedHashes}
                  />
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <AlertTriangle size={12} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#dc2626' }}>{uploadError}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'existing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: '#8894b4' }}>Previously uploaded files</p>
                <button type="button" onClick={loadExisting} className="transition-opacity hover:opacity-70">
                  <RefreshCw size={12} style={{ color: '#8894b4' }} />
                </button>
              </div>
              {loadingExisting ? (
                <div className="py-8 flex items-center justify-center">
                  <div style={{ width: 16, height: 16, border: '2px solid #dde3f5', borderTopColor: '#8894b4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : existingFiles.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText size={24} style={{ color: '#dde3f5', margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: '#b0bdd6' }}>No files uploaded yet</p>
                </div>
              ) : (
                existingFiles.map((f) => {
                  const isOpen = expandedFile === f.id;
                  const matchPct = f.match_pct ?? 0;
                  const matchColor = matchPct >= 80 ? '#16a34a' : matchPct >= 50 ? '#d97706' : '#dc2626';
                  return (
                    <div key={f.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? 'rgba(20,52,203,0.2)' : 'rgba(221,227,245,0.8)'}` }}>
                      {/* File row */}
                      <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: '#f7f9fc' }}>
                        <FileText size={14} style={{ color: '#1434cb', flexShrink: 0 }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: '#07143a' }}>{f.filename}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: '#8894b4' }}>
                              {formatCount(f.row_count)} rows · {new Date(f.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {f.match_pct > 0 && (
                              <span className="text-xs font-semibold" style={{ color: matchColor }}>{matchPct}% match</span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedFile(isOpen ? null : f.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-gray-200"
                            title="View summary"
                          >
                            <ChevronDown size={11} style={{ color: '#8894b4', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelect({
                              id: f.id, filename: f.filename, rowCount: f.row_count,
                              hasConsent: f.has_consent_flag, hasCardStatus: f.has_card_status,
                              matchPct: f.match_pct, matched: f.matched_count, unmatched: f.unmatched_count,
                            })}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                            style={{ background: '#1434cb', color: '#fff' }}
                          >
                            Use
                          </button>
                        </div>
                      </div>

                      {/* Expanded summary */}
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 pt-2" style={{ borderTop: '1px solid rgba(221,227,245,0.8)', background: '#fff' }}>
                          <div className="space-y-2 mb-3">
                            <p className="text-xs font-medium" style={{ color: '#4a5578' }}>Columns</p>
                            <div className="flex flex-wrap gap-1">
                              {(f.columns ?? []).map((col) => (
                                <span key={col} className="px-1.5 py-0.5 rounded font-mono"
                                  style={{ background: 'rgba(20,52,203,0.06)', color: '#1434cb', fontSize: '10px' }}>
                                  {col}
                                </span>
                              ))}
                            </div>
                            {(f.has_consent_flag || f.has_card_status) && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {f.has_consent_flag && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '10px' }}>
                                    <CheckCircle2 size={9} /> Consent flag
                                  </span>
                                )}
                                {f.has_card_status && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '10px' }}>
                                    <CheckCircle2 size={9} /> Card status
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {f.match_pct > 0 && (
                            <MatchSummary
                              matched={f.matched_count}
                              unmatched={f.unmatched_count}
                              matchPct={f.match_pct}
                              unmatchedHashes={f.unmatched_hashes ?? []}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(221,227,245,0.8)', paddingTop: 16 }}>
          <button type="button" onClick={onClose} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#8894b4' }}>Cancel</button>
          {tab === 'upload' && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: '#1434cb', color: '#fff' }}
            >
              {uploading ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Upload size={12} />}
              {uploading ? 'Uploading…' : 'Use this file'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upsell card for locked packages ──────────────────────────────────────────
const UPSELL_PACKAGES_PRIMARY = [
  { id: 'vif_spend_stimulation', label: 'VIF Spend Stimulation', tagline: 'Drive incremental spend with AI-powered propensity models', icon: Sparkles, color: '#16a34a' },
  { id: 'vif_retention', label: 'VIF Retention', tagline: 'Predict & prevent churn with lifecycle intelligence', icon: Shield, color: '#d97706' },
];
const UPSELL_PACKAGES_EXTRA = [
  { id: 'vif_fraud', label: 'VIF Fraud & Auth', tagline: 'Reduce false declines with Visa fraud intelligence', icon: Lock, color: '#dc2626' },
  { id: 'vif_acquisition', label: 'VIF Acquisition', tagline: 'Identify high-propensity prospects with lookalike models', icon: UserPlus, color: '#1434cb' },
];

// ── Dual-handle range slider ──────────────────────────────────────────────────
function RangeSlider({
  min, max, step = 1, value, onChange, formatVal,
}: {
  min: number; max: number; step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  formatVal: (v: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'min' | 'max' | null>(null);

  function posFromEvent(e: MouseEvent | TouchEvent): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  }

  function startDrag(handle: 'min' | 'max') {
    dragging.current = handle;
    function onMove(e: MouseEvent | TouchEvent) {
      const v = posFromEvent(e);
      if (handle === 'min') onChange([Math.min(v, value[1] - step), value[1]]);
      else onChange([value[0], Math.max(v, value[0] + step)]);
    }
    function onUp() {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  }

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="px-1 py-2">
      {/* Value labels */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(20,52,203,0.08)', color: '#1434cb' }}>{formatVal(value[0])}</span>
        <span className="text-xs" style={{ color: '#8894b4' }}>to</span>
        <span className="px-2 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(20,52,203,0.08)', color: '#1434cb' }}>{formatVal(value[1])}{value[1] === max ? '+' : ''}</span>
      </div>
      {/* Track */}
      <div ref={trackRef} className="relative h-1.5 rounded-full" style={{ background: 'rgba(221,227,245,0.9)' }}>
        {/* Fill */}
        <div className="absolute h-full rounded-full" style={{
          left: `${pct(value[0])}%`,
          width: `${pct(value[1]) - pct(value[0])}%`,
          background: '#1434cb',
        }} />
        {/* Min handle */}
        <button
          type="button"
          onMouseDown={() => startDrag('min')}
          onTouchStart={() => startDrag('min')}
          className="absolute w-4 h-4 rounded-full bg-white -translate-y-1/2 top-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing focus:outline-none"
          style={{ left: `${pct(value[0])}%`, border: '2px solid #1434cb', boxShadow: '0 1px 4px rgba(20,52,203,0.25)', zIndex: 2 }}
        />
        {/* Max handle */}
        <button
          type="button"
          onMouseDown={() => startDrag('max')}
          onTouchStart={() => startDrag('max')}
          className="absolute w-4 h-4 rounded-full bg-white -translate-y-1/2 top-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing focus:outline-none"
          style={{ left: `${pct(value[1])}%`, border: '2px solid #1434cb', boxShadow: '0 1px 4px rgba(20,52,203,0.25)', zIndex: 2 }}
        />
      </div>
      {/* Min/max labels */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: '#b0bdd6' }}>{formatVal(min)}</span>
        <span className="text-xs" style={{ color: '#b0bdd6' }}>{formatVal(max)}+</span>
      </div>
    </div>
  );
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 36, height: 20, background: on ? '#f7b600' : '#dde3f5' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? '18px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
      />
    </button>
  );
}

// ── Bank data targeting panel (shown when enrichment CSV is attached) ─────────
function BankDataTargetingPanel({
  enabled,
  onToggleEnabled,
  filters,
  onChange,
  hasConsent,
  hasCardStatus,
  csvColumns,
}: {
  enabled: boolean;
  onToggleEnabled: () => void;
  filters: BankDataFilters;
  onChange: (f: BankDataFilters) => void;
  hasConsent: boolean;
  hasCardStatus: boolean;
  csvColumns?: string[];
}) {
  const hasCreditLimit = csvColumns?.includes('credit_limit') ?? false;
  const hasRemainingLimit = csvColumns?.includes('remaining_limit') ?? false;
  const hasUtilisation = csvColumns?.includes('utilisation_pct') ?? false;

  const creditLimitRange = filters.credit_limit_range ?? [0, 500];
  const remainingLimitRange = filters.remaining_limit_range ?? [0, 500];
  const utilisationRange = filters.utilisation_range ?? [0, 100];

  const hasActiveFilters = enabled && (
    filters.credit_limit_range || filters.remaining_limit_range ||
    filters.utilisation_range || filters.card_status === 'active_only' || filters.consent_only
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${enabled ? 'rgba(247,182,0,0.4)' : 'rgba(221,227,245,0.8)'}`, background: enabled ? '#fffdf5' : '#f9fafc', transition: 'border-color 0.2s' }}>
      {/* Header with toggle */}
      <div className="px-5 py-4 flex items-start justify-between gap-4"
        style={{ background: enabled ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f4f6fb', borderBottom: enabled ? '1px solid rgba(247,182,0,0.2)' : '1px solid transparent', transition: 'background 0.2s' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <Database size={14} style={{ color: enabled ? '#c48600' : '#8894b4' }} />
            <p className="text-sm font-bold" style={{ color: '#07143a' }}>Use Bank Data for Targeting</p>
            <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: enabled ? 'rgba(247,182,0,0.18)' : 'rgba(180,190,214,0.15)', color: enabled ? '#8f5f00' : '#8894b4', fontSize: '9px' }}>BANK</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#4a5578' }}>
            {enabled
              ? 'Filters from your bank data will be applied on top of the Visa targeting above.'
              : 'Toggle on to add bank data filters on top of your Visa audience.'}
          </p>
        </div>
        <ToggleSwitch on={enabled} onToggle={onToggleEnabled} />
      </div>

      {/* Filter fields — only shown when enabled */}
      {enabled && (
        <div className="p-5 space-y-6">

          {/* Credit Limit slider */}
          {hasCreditLimit && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} style={{ color: '#c48600' }} />
                  <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Credit Limit</p>
                  <span className="text-xs" style={{ color: '#8894b4' }}>Rp million</span>
                </div>
                {filters.credit_limit_range && (
                  <button type="button" onClick={() => onChange({ ...filters, credit_limit_range: undefined })}
                    className="text-xs transition-opacity hover:opacity-70" style={{ color: '#dc2626' }}>Reset</button>
                )}
              </div>
              <RangeSlider
                min={0} max={500} step={5}
                value={creditLimitRange}
                onChange={(v) => onChange({ ...filters, credit_limit_range: v })}
                formatVal={(v) => `Rp ${v}M`}
              />
            </div>
          )}

          {/* Remaining Limit slider */}
          {hasRemainingLimit && (
            <>
              {hasCreditLimit && <div style={{ height: '1px', background: 'rgba(221,227,245,0.8)' }} />}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={12} style={{ color: '#c48600' }} />
                    <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Remaining Limit</p>
                    <span className="text-xs" style={{ color: '#8894b4' }}>Rp million</span>
                  </div>
                  {filters.remaining_limit_range && (
                    <button type="button" onClick={() => onChange({ ...filters, remaining_limit_range: undefined })}
                      className="text-xs transition-opacity hover:opacity-70" style={{ color: '#dc2626' }}>Reset</button>
                  )}
                </div>
                <RangeSlider
                  min={0} max={500} step={5}
                  value={remainingLimitRange}
                  onChange={(v) => onChange({ ...filters, remaining_limit_range: v })}
                  formatVal={(v) => `Rp ${v}M`}
                />
              </div>
            </>
          )}

          {/* Utilisation % slider */}
          {hasUtilisation && (
            <>
              {(hasCreditLimit || hasRemainingLimit) && <div style={{ height: '1px', background: 'rgba(221,227,245,0.8)' }} />}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={12} style={{ color: '#c48600' }} />
                    <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Credit Utilisation</p>
                    <span className="text-xs" style={{ color: '#8894b4' }}>% of limit used</span>
                  </div>
                  {filters.utilisation_range && (
                    <button type="button" onClick={() => onChange({ ...filters, utilisation_range: undefined })}
                      className="text-xs transition-opacity hover:opacity-70" style={{ color: '#dc2626' }}>Reset</button>
                  )}
                </div>
                <RangeSlider
                  min={0} max={100} step={1}
                  value={utilisationRange}
                  onChange={(v) => onChange({ ...filters, utilisation_range: v })}
                  formatVal={(v) => `${v}%`}
                />
              </div>
            </>
          )}

          {/* Compliance toggles */}
          {(hasCardStatus || hasConsent) && (
            <>
              <div style={{ height: '1px', background: 'rgba(221,227,245,0.8)' }} />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em', fontSize: '10px' }}>Compliance</p>

                {hasCardStatus && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.9)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(247,182,0,0.15)' }}>
                        <CheckCircle2 size={12} style={{ color: '#c48600' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Active cards only</p>
                        <p className="text-xs" style={{ color: '#8894b4' }}>Exclude cancelled, blocked or inactive</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      on={filters.card_status === 'active_only'}
                      onToggle={() => onChange({ ...filters, card_status: filters.card_status === 'active_only' ? 'all' : 'active_only' })}
                    />
                  </div>
                )}

                {hasConsent && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.9)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,52,203,0.08)' }}>
                        <Shield size={12} style={{ color: '#1434cb' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Consented cardholders only</p>
                        <p className="text-xs" style={{ color: '#8894b4' }}>consent_flag = true in your data</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      on={!!filters.consent_only}
                      onToggle={() => onChange({ ...filters, consent_only: !filters.consent_only })}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Reset all */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button type="button" onClick={() => onChange({})}
                className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#dc2626' }}>
                Reset all bank filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Step2DataInput({ data, onChange, onNext, onBack }: Props) {
  const [filters, setFilters] = useState<CardholderFilter>(data.ch_filters ?? {});
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showEnrichModal, setShowEnrichModal] = useState(false);

  function handleSourceSelect(sourceId: string) {
    onChange({ data_source: sourceId as Step2Data['data_source'], selected_vif_segment: undefined, ch_filters: {} });
    setFilters({});
  }

  function handleFiltersChange(f: CardholderFilter) {
    setFilters(f);
    onChange({ ...data, ch_filters: f });
  }

  const xbIntelligenceCount = useMemo(() => {
    if (data.data_source !== 'vif_xb_intelligence') return 0;
    return filterCardholders(filters).length;
  }, [data.data_source, filters]);

  const canContinue = data.data_source === 'vif_xb_intelligence' && xbIntelligenceCount > 0;

  const isSelected = data.data_source === 'vif_xb_intelligence';
  const hasEnrichment = isSelected && !!data.enriched_csv_file_id;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    Object.keys(filters).forEach((k) => {
      const val = filters[k as keyof CardholderFilter];
      if (Array.isArray(val) ? val.length > 0 : val !== undefined && val !== 1) n++;
    });
    if (data.bank_data_enabled && data.bank_data_filters) {
      const bf = data.bank_data_filters;
      if (bf.credit_limit_range) n++;
      if (bf.remaining_limit_range) n++;
      if (bf.utilisation_range) n++;
      if (bf.card_status === 'active_only') n++;
      if (bf.consent_only) n++;
    }
    return n;
  }, [filters, data.bank_data_enabled, data.bank_data_filters]);

  const showSidePanel = data.data_source === 'vif_xb_intelligence';

  return (
    <div className={showSidePanel ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]' : ''}>
      <div className="space-y-8 min-w-0">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8894b4', letterSpacing: '0.12em' }}>Step 2</p>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#07143a' }}>Select Data Source</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#4a5578', maxWidth: 420 }}>
          Choose how to define your cardholder segment. VIF XB Intelligence offers the richest targeting signals.
        </p>
      </div>

      {/* ── VISA Intelligence and Data Signals Package ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>
          VISA Intelligence and Data Signals Package
        </p>

        {/* Side-by-side: active left, inactive right */}
        <div className="flex gap-2 items-stretch">

          {/* LEFT — Active: VIF Cross-Border */}
          <button
            type="button"
            onClick={() => handleSourceSelect('vif_xb_intelligence')}
            className="flex-1 text-left rounded-xl transition-all flex flex-col"
            style={isSelected
              ? { background: 'linear-gradient(145deg, #eef2ff 0%, #e8f0fe 100%)', boxShadow: '0 0 0 2.5px #1434cb, 0 6px 24px rgba(20,52,203,0.14)' }
              : { background: '#fff', border: '1px solid rgba(221,227,245,0.8)' }}
          >
            <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: isSelected ? '#1434cb' : '#f0f3fb' }}>
                <Filter size={14} style={{ color: isSelected ? '#fff' : '#8894b4' }} />
              </div>
              <p className="text-sm font-bold flex-1 leading-tight" style={{ color: '#07143a' }}>VIF Cross-Border</p>
              <span className="px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: '#07143a', color: '#f7b600', fontSize: '9px' }}>ACTIVE</span>
            </div>
            <div className="px-3.5 pb-3.5 flex-1 space-y-2.5">
              <p className="text-xs leading-relaxed" style={{ color: isSelected ? '#4a5578' : '#8894b4' }}>
                Cardholder-level XB intelligence — card tier, DFMC, persona, travel propensity &amp; more. Data as of 31 Dec 2025.
              </p>
              {/* Subscription info */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: isSelected ? 'rgba(20,52,203,0.1)' : 'rgba(20,52,203,0.05)', border: '1px solid rgba(20,52,203,0.15)' }}>
                <CheckCircle2 size={11} style={{ color: '#1434cb' }} />
                <span className="text-xs font-semibold" style={{ color: '#1434cb' }}>1 active subscription</span>
              </div>
              {isSelected && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                  <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Selected</span>
                </div>
              )}
            </div>
          </button>

          {/* RIGHT — Inactive packages stacked */}
          <div className="flex flex-col gap-2" style={{ width: '44%' }}>
            {UPSELL_PACKAGES_PRIMARY.map((pkg) => {
              const Icon = pkg.icon;
              const open = expandedPkg === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setExpandedPkg(open ? null : pkg.id)}
                  className="rounded-xl text-left transition-all w-full"
                  style={{ background: '#fff', border: `1px solid ${open ? 'rgba(20,52,203,0.2)' : 'rgba(221,227,245,0.8)'}` }}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <Icon size={11} style={{ color: pkg.color, opacity: 0.5 }} />
                    </div>
                    <p className="text-xs font-semibold flex-1 leading-tight" style={{ color: '#4a5578' }}>{pkg.label}</p>
                    <ChevronDown size={10} style={{ color: '#b0bdd6', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </div>
                  {open && (
                    <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(221,227,245,0.6)' }}>
                      <p className="text-xs leading-relaxed mt-2 mb-2" style={{ color: '#b0bdd6' }}>{pkg.tagline}</p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(180,190,214,0.15)', color: '#8894b4', fontSize: '10px', fontWeight: 500 }}>
                        <Lock size={8} style={{ color: '#b0bdd6' }} />
                        Not subscribed
                      </span>
                    </div>
                  )}
                </button>
              );
            })}

            {/* See more button */}
            <button
              type="button"
              onClick={() => setShowMoreModal(true)}
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70 pt-0.5"
              style={{ color: '#8894b4' }}
            >
              <ChevronDown size={10} />
              +{UPSELL_PACKAGES_EXTRA.length} more packages
            </button>
          </div>
        </div>

        {/* ── Enrich with Bank Data ── */}
        <div style={{ height: '1px', background: 'rgba(221,227,245,0.6)' }} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={14} style={{ color: '#1434cb' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>Enrich with Bank Data</p>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(20,52,203,0.06)', color: '#1434cb', fontSize: '10px' }}>Optional</span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#4a5578', maxWidth: 440 }}>
            Combine VIF intelligence with your own card-level bank data. Records are joined on SHA-256 card hash — no raw card numbers leave your systems.
          </p>

          {!hasEnrichment ? (
            <button
              type="button"
              onClick={() => setShowEnrichModal(true)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl w-full text-left transition-all"
              style={{ background: '#fff', border: '1px solid rgba(221,227,245,0.8)', boxShadow: '0 1px 4px rgba(7,20,58,0.05)' }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0f3fb' }}>
                <Link2 size={13} style={{ color: '#8894b4' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#07143a' }}>Upload card-level bank data to combine</p>
                <p className="text-xs" style={{ color: '#8894b4' }}>Credit limit, utilisation, card status, consent — joined with VIF signals</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(20,52,203,0.08)', color: '#1434cb' }}>Add data</span>
            </button>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(247,182,0,0.35)', background: '#fff' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(247,182,0,0.06)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(247,182,0,0.15)' }}>
                  <CheckCircle2 size={13} style={{ color: '#c48600' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <FileText size={11} style={{ color: '#c48600' }} />
                    <span className="text-xs font-semibold truncate" style={{ color: '#07143a' }}>{data.enriched_csv_filename}</span>
                    {data.enriched_csv_row_count !== undefined && (
                      <span className="text-xs" style={{ color: '#8894b4' }}>— {formatCount(data.enriched_csv_row_count)} rows</span>
                    )}
                  </div>
                  {data.enriched_csv_match_pct !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(247,182,0,0.2)', maxWidth: 100 }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round(data.enriched_csv_match_pct)}%`, background: '#f7b600' }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#c48600' }}>{data.enriched_csv_match_pct}% VIF match</span>
                      {data.enriched_csv_matched !== undefined && (
                        <span className="text-xs" style={{ color: '#8894b4' }}>{formatCount(data.enriched_csv_matched)} joined</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => setShowEnrichModal(true)}
                    className="text-xs font-medium px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: '#1434cb', background: 'rgba(20,52,203,0.07)' }}>
                    Change
                  </button>
                  <button type="button"
                    onClick={() => onChange({
                      ...data,
                      enriched_csv_file_id: undefined, enriched_csv_filename: undefined,
                      enriched_csv_row_count: undefined, enriched_csv_match_pct: undefined,
                      enriched_csv_matched: undefined, enriched_csv_unmatched: undefined,
                      enriched_csv_columns: undefined, enriched_csv_has_consent: undefined,
                      enriched_csv_has_card_status: undefined,
                      bank_data_enabled: undefined, bank_data_filters: undefined,
                    })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={12} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── VIF Cross-Border filter panel (Visa data first) ── */}
        {data.data_source === 'vif_xb_intelligence' && (
          <>
            <div style={{ height: '1px', background: 'rgba(221,227,245,0.6)' }} />
            <XbIntelligencePanel filters={filters} onChange={handleFiltersChange} />
          </>
        )}

        {/* ── Bank data targeting (after Visa data, toggle-gated) ── */}
        {hasEnrichment && (
          <BankDataTargetingPanel
            enabled={!!data.bank_data_enabled}
            onToggleEnabled={() => onChange({ ...data, bank_data_enabled: !data.bank_data_enabled })}
            filters={data.bank_data_filters ?? {}}
            onChange={(f) => onChange({ ...data, bank_data_filters: f })}
            hasConsent={!!data.enriched_csv_has_consent}
            hasCardStatus={!!data.enriched_csv_has_card_status}
            csvColumns={data.enriched_csv_columns}
          />
        )}

      </div>

      {/* ── "See more" modal ── */}
      {showMoreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(7,20,58,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowMoreModal(false)}
        >
          <div
            className="relative rounded-2xl p-6 w-full mx-4"
            style={{ maxWidth: 400, background: '#fff', boxShadow: '0 20px 60px rgba(7,20,58,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowMoreModal(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            >
              <X size={14} style={{ color: '#8894b4' }} />
            </button>

            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>
              More Intelligence Packages
            </p>

            <div className="space-y-3 mb-5">
              {UPSELL_PACKAGES_EXTRA.map((pkg) => {
                const Icon = pkg.icon;
                return (
                  <div key={pkg.id} className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ background: '#f7f9fc', border: '1px solid rgba(221,227,245,0.8)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <Icon size={13} style={{ color: pkg.color, opacity: 0.5 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold mb-0.5" style={{ color: '#07143a' }}>{pkg.label}</p>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: '#8894b4' }}>{pkg.tagline}</p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: 'rgba(180,190,214,0.15)', color: '#8894b4', fontSize: '10px' }}>
                        <Lock size={8} style={{ color: '#b0bdd6' }} />
                        Not subscribed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AE contact card */}
            <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e8f0fe 100%)', border: '1px solid rgba(20,52,203,0.1)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#07143a' }}>Contact your account manager</p>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1"
                  alt="Siti Maimunah"
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: '#07143a' }}>Siti Maimunah</p>
                  <p className="text-xs" style={{ color: '#4a5578' }}>Visa Account Manager, Indonesia</p>
                </div>
              </div>
              <a
                href="mailto:Siti@visa.com"
                className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: '#1434cb' }}
              >
                <Mail size={12} style={{ color: '#fff' }} />
                <span className="text-xs font-medium text-white">Siti@visa.com</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Enrich CSV modal */}
      {showEnrichModal && (
        <CsvUploadModal
          issuerId={null}
          onClose={() => setShowEnrichModal(false)}
          onSelect={({ id, filename, rowCount, hasConsent, hasCardStatus, matchPct, matched, unmatched }) => {
            // We need columns — read from the modal selection; for existing files use stored columns
            onChange({
              ...data,
              enriched_csv_file_id: id,
              enriched_csv_filename: filename,
              enriched_csv_row_count: rowCount,
              enriched_csv_has_consent: hasConsent,
              enriched_csv_has_card_status: hasCardStatus,
              enriched_csv_match_pct: matchPct,
              enriched_csv_matched: matched,
              enriched_csv_unmatched: unmatched,
              enriched_csv_columns: [
                'card_hash_sha256',
                'credit_limit',
                'remaining_limit',
                'utilisation_pct',
                ...(hasConsent ? ['consent_flag'] : []),
                ...(hasCardStatus ? ['card_status'] : []),
              ],
            });
            setShowEnrichModal(false);
          }}
        />
      )}

      <div style={{ height: '1px', background: 'rgba(221,227,245,0.6)' }} />
      <div className="flex justify-between">
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack}>Back</Button>
        <Button icon={<ArrowRight size={15} />} onClick={onNext} disabled={!canContinue}>Continue to Segment</Button>
      </div>
      </div>

      {/* Sticky live audience sidebar — side-by-side with filters, never overlaps content */}
      {showSidePanel && (
        <aside className="hidden lg:block">
          <LiveAudienceFloatingPanel
            filters={filters}
            activeFilterCount={activeFilterCount}
            bankEnabled={!!data.bank_data_enabled}
            bankFilters={data.bank_data_filters}
          />
        </aside>
      )}
    </div>
  );
}
