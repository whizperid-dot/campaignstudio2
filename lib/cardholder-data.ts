// Synthetic cardholder dataset based on VIF XB Intelligence field specification.
// Data date: 2025-12-31. All monetary values in IDR.

export type CardTier = 'Classic' | 'Gold' | 'Platinum' | 'Signature' | 'Infinite';
export type DfmcSegment = 'Top of Wallet' | 'High Potential' | 'Average Potential' | 'Selective';
export type ConsumerPersona =
  | 'Everyday Essentialist'
  | 'Food Lover'
  | 'Coffee Lover'
  | 'Aesthetics & Lifestyle Shopper'
  | 'Online Shopper'
  | 'Travel Enthusiast'
  | 'Tech Early Adopter'
  | 'Family Planner'
  | 'Health & Wellness'
  | 'Luxury Seeker'
  | 'Budget Conscious'
  | 'Business Traveller'
  | 'Entertainment Seeker'
  | 'Sports & Outdoors';
export type AffluentPersona =
  | 'Non-Affluent'
  | 'Mass Affluent'
  | 'Core Affluent'
  | 'HNW';
export type TravelStatus = 'Active Traveller' | 'Non-Active Traveller';

export type Cardholder = {
  updated_data_date: string;
  card_number: string;
  card_hash_sha256: string;
  card_tier: CardTier;
  mob: number;
  dfmc_segment: DfmcSegment;
  consumer_persona: ConsumerPersona;
  affluent_persona: AffluentPersona;
  active_xb_ind: TravelStatus;
  // Travel probability scores
  travel_next3mnth_prob_active_xb_cp: number;
  travel_next3mnth_prob_active_xb_cp_decile: number;
  travel_next3mnth_prob_inactive_xb_cp: number;
  travel_next3mnth_prob_inactive_xb_cp_decile: number;
  // Spend metrics
  l12m_avg_spend_pertrip_xb_cp: number;
  l12m_spend_pertrip_xb_cp_market: string;
  l12m_spend_all: number;
  l12m_spend_xb_cp: number;
  l12m_spend_xb_cp_yoy: number;
  l12m_trx_xb_cp: number;
  l12m_spend_top_corridor: string;
  // Market travel actual rates — active traveller, decile 1–10
  l12m_market_rate_active_d1: number;
  l12m_market_rate_active_d2: number;
  l12m_market_rate_active_d3: number;
  l12m_market_rate_active_d4: number;
  l12m_market_rate_active_d5: number;
  l12m_market_rate_active_d6: number;
  l12m_market_rate_active_d7: number;
  l12m_market_rate_active_d8: number;
  l12m_market_rate_active_d9: number;
  l12m_market_rate_active_d10: number;
  // Market travel actual rates — non-active traveller, decile 1–10
  l12m_market_rate_inactive_d1: number;
  l12m_market_rate_inactive_d2: number;
  l12m_market_rate_inactive_d3: number;
  l12m_market_rate_inactive_d4: number;
  l12m_market_rate_inactive_d5: number;
  l12m_market_rate_inactive_d6: number;
  l12m_market_rate_inactive_d7: number;
  l12m_market_rate_inactive_d8: number;
  l12m_market_rate_inactive_d9: number;
  l12m_market_rate_inactive_d10: number;
};

// ─── Synthetic generation helpers ────────────────────────────────────────────

const TIERS: CardTier[] = ['Classic', 'Gold', 'Platinum', 'Signature', 'Infinite'];
const TIER_WEIGHTS = [0.30, 0.28, 0.22, 0.13, 0.07];

const DFMC: DfmcSegment[] = ['Top of Wallet', 'High Potential', 'Average Potential', 'Selective'];
const DFMC_WEIGHTS = [0.18, 0.27, 0.35, 0.20];

const PERSONAS: ConsumerPersona[] = [
  'Everyday Essentialist', 'Food Lover', 'Coffee Lover', 'Aesthetics & Lifestyle Shopper',
  'Online Shopper', 'Travel Enthusiast', 'Tech Early Adopter', 'Family Planner',
  'Health & Wellness', 'Luxury Seeker', 'Budget Conscious', 'Business Traveller',
  'Entertainment Seeker', 'Sports & Outdoors',
];

const AFFLUENT: AffluentPersona[] = [
  'Non-Affluent', 'Mass Affluent', 'Core Affluent', 'HNW',
];
const AFFLUENT_WEIGHTS = [0.30, 0.35, 0.25, 0.10];

const CORRIDORS = [
  'SGP', 'MYS', 'JPN', 'KOR', 'AUS', 'USA', 'GBR', 'ARE', 'HKG', 'THA', 'CHN', 'NLD',
];

const MARKETS = ['SGP', 'MYS', 'JPN', 'KOR', 'AUS', 'USA', 'GBR', 'ARE', 'HKG', 'THA'];

// Baseline market travel rates per decile (active travellers)
const ACTIVE_MARKET_RATES = [0.08, 0.13, 0.19, 0.26, 0.34, 0.43, 0.53, 0.63, 0.74, 0.85];
// Baseline market travel rates per decile (non-active travellers)
const INACTIVE_MARKET_RATES = [0.02, 0.04, 0.07, 0.10, 0.14, 0.19, 0.25, 0.33, 0.43, 0.55];

// Deterministic SHA-256-like 64-char hex from a card number string
function deterministicHash(cardNumber: string): string {
  // Simple but stable: hash each char through a linear congruential mix
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  for (let i = 0; i < cardNumber.length; i++) {
    const c = cardNumber.charCodeAt(i);
    h0 = ((h0 ^ (c * 0x9e3779b9)) >>> 0);
    h1 = ((h1 ^ (h0 << 5) ^ c) >>> 0);
    h2 = ((h2 ^ (h1 * 0x517cc1b7)) >>> 0);
    h3 = ((h3 ^ (h2 + c * 0x27d4eb2f)) >>> 0);
    h4 = ((h4 ^ (h3 >> 3)) >>> 0);
    h5 = ((h5 ^ (h4 * 0xb5c0fbcf)) >>> 0);
    h6 = ((h6 ^ (h5 + h0)) >>> 0);
    h7 = ((h7 ^ (h6 ^ h1)) >>> 0);
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rangeInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rangeFloat(min: number, max: number, decimals = 4): number {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

function probToDecile(prob: number): number {
  if (prob >= 0.80) return 10;
  if (prob >= 0.68) return 9;
  if (prob >= 0.56) return 8;
  if (prob >= 0.45) return 7;
  if (prob >= 0.35) return 6;
  if (prob >= 0.26) return 5;
  if (prob >= 0.18) return 4;
  if (prob >= 0.11) return 3;
  if (prob >= 0.05) return 2;
  return 1;
}

// Tier-based spend multipliers
const TIER_SPEND_BASE: Record<CardTier, [number, number]> = {
  Classic:   [2_000_000,   8_000_000],
  Gold:      [5_000_000,  18_000_000],
  Platinum:  [12_000_000, 40_000_000],
  Signature: [30_000_000, 80_000_000],
  Infinite:  [70_000_000,200_000_000],
};

function generateCardholder(index: number): Cardholder {
  const tier = weightedRandom(TIERS, TIER_WEIGHTS);
  const dfmc = weightedRandom(DFMC, DFMC_WEIGHTS);
  const affluent = weightedRandom(AFFLUENT, AFFLUENT_WEIGHTS);
  const persona = pick(PERSONAS);
  const mob = rangeInt(1, 120);

  // Travel status: higher tiers more likely to be active travellers
  const activeProb = tier === 'Infinite' ? 0.80 : tier === 'Signature' ? 0.65 : tier === 'Platinum' ? 0.48 : tier === 'Gold' ? 0.35 : 0.18;
  const isActive = Math.random() < activeProb;
  const travelStatus: TravelStatus = isActive ? 'Active Traveller' : 'Non-Active Traveller';

  // Travel probability scores
  const activeScore = isActive
    ? rangeFloat(0.35, 0.95)
    : rangeFloat(0.05, 0.40);
  const inactiveScore = isActive
    ? rangeFloat(0.10, 0.45)
    : rangeFloat(0.02, 0.25);

  // Spend data
  const [spendMin, spendMax] = TIER_SPEND_BASE[tier];
  const l12m_spend_all = rangeInt(spendMin * 12, spendMax * 12);
  const xbShare = isActive
    ? rangeFloat(0.15, 0.55)
    : rangeFloat(0.02, 0.18);
  const l12m_spend_xb_cp = Math.round(l12m_spend_all * xbShare);
  const l12m_spend_xb_cp_yoy = rangeFloat(-0.30, 0.65, 2);
  const l12m_trx_xb_cp = isActive ? rangeInt(4, 48) : rangeInt(0, 6);
  const l12m_avg_spend_pertrip = l12m_trx_xb_cp > 0 ? Math.round(l12m_spend_xb_cp / l12m_trx_xb_cp) : 0;

  // Market rates with slight noise around baseline
  function marketRate(base: number): number {
    return parseFloat(Math.min(1, Math.max(0, base + rangeFloat(-0.03, 0.03))).toFixed(4));
  }

  const card_number = `4${String(index + 1).padStart(15, '0')}`;
  return {
    updated_data_date: '2025-12-31',
    card_number,
    card_hash_sha256: deterministicHash(card_number),
    card_tier: tier,
    mob,
    dfmc_segment: dfmc,
    consumer_persona: persona,
    affluent_persona: affluent,
    active_xb_ind: travelStatus,
    travel_next3mnth_prob_active_xb_cp: activeScore,
    travel_next3mnth_prob_active_xb_cp_decile: probToDecile(activeScore),
    travel_next3mnth_prob_inactive_xb_cp: inactiveScore,
    travel_next3mnth_prob_inactive_xb_cp_decile: probToDecile(inactiveScore),
    l12m_avg_spend_pertrip_xb_cp: l12m_avg_spend_pertrip,
    l12m_spend_pertrip_xb_cp_market: pick(MARKETS),
    l12m_spend_all,
    l12m_spend_xb_cp,
    l12m_spend_xb_cp_yoy,
    l12m_trx_xb_cp,
    l12m_spend_top_corridor: pick(CORRIDORS),
    l12m_market_rate_active_d1:  marketRate(ACTIVE_MARKET_RATES[0]),
    l12m_market_rate_active_d2:  marketRate(ACTIVE_MARKET_RATES[1]),
    l12m_market_rate_active_d3:  marketRate(ACTIVE_MARKET_RATES[2]),
    l12m_market_rate_active_d4:  marketRate(ACTIVE_MARKET_RATES[3]),
    l12m_market_rate_active_d5:  marketRate(ACTIVE_MARKET_RATES[4]),
    l12m_market_rate_active_d6:  marketRate(ACTIVE_MARKET_RATES[5]),
    l12m_market_rate_active_d7:  marketRate(ACTIVE_MARKET_RATES[6]),
    l12m_market_rate_active_d8:  marketRate(ACTIVE_MARKET_RATES[7]),
    l12m_market_rate_active_d9:  marketRate(ACTIVE_MARKET_RATES[8]),
    l12m_market_rate_active_d10: marketRate(ACTIVE_MARKET_RATES[9]),
    l12m_market_rate_inactive_d1:  marketRate(INACTIVE_MARKET_RATES[0]),
    l12m_market_rate_inactive_d2:  marketRate(INACTIVE_MARKET_RATES[1]),
    l12m_market_rate_inactive_d3:  marketRate(INACTIVE_MARKET_RATES[2]),
    l12m_market_rate_inactive_d4:  marketRate(INACTIVE_MARKET_RATES[3]),
    l12m_market_rate_inactive_d5:  marketRate(INACTIVE_MARKET_RATES[4]),
    l12m_market_rate_inactive_d6:  marketRate(INACTIVE_MARKET_RATES[5]),
    l12m_market_rate_inactive_d7:  marketRate(INACTIVE_MARKET_RATES[6]),
    l12m_market_rate_inactive_d8:  marketRate(INACTIVE_MARKET_RATES[7]),
    l12m_market_rate_inactive_d9:  marketRate(INACTIVE_MARKET_RATES[8]),
    l12m_market_rate_inactive_d10: marketRate(INACTIVE_MARKET_RATES[9]),
  };
}

// Seed-stable generation: generate once, export as constant
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Generate 500 synthetic cardholders deterministically
function generateDataset(n: number): Cardholder[] {
  const rng = seededRandom(42);
  // Temporarily override Math.random with seeded version for deterministic output
  const origRandom = Math.random;
  Math.random = rng;
  const dataset: Cardholder[] = [];
  for (let i = 0; i < n; i++) {
    dataset.push(generateCardholder(i));
  }
  Math.random = origRandom;
  return dataset;
}

export const CARDHOLDER_DATASET: Cardholder[] = generateDataset(100_000);

// ─── Derived filter / aggregation utilities ───────────────────────────────────

export type CardholderFilter = {
  card_tiers?: CardTier[];
  dfmc_segments?: DfmcSegment[];
  consumer_personas?: ConsumerPersona[];
  affluent_personas?: AffluentPersona[];
  travel_status?: TravelStatus[];
  min_mob?: number;
  max_mob?: number;
  min_active_decile?: number;
  min_inactive_decile?: number;
  corridors?: string[];
};

export function filterCardholders(filters: CardholderFilter): Cardholder[] {
  return CARDHOLDER_DATASET.filter((ch) => {
    if (filters.card_tiers?.length && !filters.card_tiers.includes(ch.card_tier)) return false;
    if (filters.dfmc_segments?.length && !filters.dfmc_segments.includes(ch.dfmc_segment)) return false;
    if (filters.consumer_personas?.length && !filters.consumer_personas.includes(ch.consumer_persona)) return false;
    if (filters.affluent_personas?.length && !filters.affluent_personas.includes(ch.affluent_persona)) return false;
    if (filters.travel_status?.length && !filters.travel_status.includes(ch.active_xb_ind)) return false;
    if (filters.min_mob !== undefined && ch.mob < filters.min_mob) return false;
    if (filters.max_mob !== undefined && ch.mob > filters.max_mob) return false;
    // Propensity decile filters use OR logic across travel status:
    // Each cardholder is tested only against the threshold relevant to their own travel status.
    // When both thresholds are set, a cardholder passes if they satisfy the one that applies to them.
    const hasActiveFilter = filters.min_active_decile !== undefined;
    const hasInactiveFilter = filters.min_inactive_decile !== undefined;
    if (hasActiveFilter || hasInactiveFilter) {
      const isActive = ch.active_xb_ind === 'Active Traveller';
      if (isActive) {
        // Active travellers: must meet active decile threshold (inactive threshold doesn't apply)
        if (hasActiveFilter && ch.travel_next3mnth_prob_active_xb_cp_decile < filters.min_active_decile!) return false;
      } else {
        // Non-active travellers: must meet inactive decile threshold (active threshold doesn't apply)
        if (hasInactiveFilter && ch.travel_next3mnth_prob_inactive_xb_cp_decile < filters.min_inactive_decile!) return false;
      }
    }
    if (filters.corridors?.length && !filters.corridors.includes(ch.l12m_spend_top_corridor)) return false;
    return true;
  });
}

export type CorridorShare = { code: string; sharePct: number };

export type SegmentStats = {
  count: number;
  avgSpendAll: number;
  avgSpendXb: number;
  avgSpendPerTrip: number;          // avg XB spend per trip (IDR)
  avgTrxXb: number;
  avgTravelProbActive: number;
  avgTravelProbInactive: number;
  avgXbShare: number;
  avgYoY: number;
  avgSpendPerTripYoY: number;       // YoY growth on per-trip spend (derived proxy)
  activeTravellerPct: number;
  topCorridor: string;
  secondCorridor: string;
  corridorShareTop: number;
  corridorShareSecond: number;
  top3Corridors: CorridorShare[];   // top 3 corridors with share %
  topPersona: ConsumerPersona;
  topAffluentTier: AffluentPersona;
  personaDistribution: { persona: ConsumerPersona; pct: number }[];   // all, sorted desc
  affluentDistribution: { tier: AffluentPersona; pct: number }[];     // all, sorted desc
  decileDistribution: Record<number, number>;
  tierDistribution: Record<CardTier, number>;
  dfmcDistribution: Record<DfmcSegment, number>;
};

export function computeSegmentStats(cardholders: Cardholder[]): SegmentStats {
  if (cardholders.length === 0) {
    return {
      count: 0, avgSpendAll: 0, avgSpendXb: 0, avgSpendPerTrip: 0, avgTrxXb: 0,
      avgTravelProbActive: 0, avgTravelProbInactive: 0, avgXbShare: 0,
      avgYoY: 0, avgSpendPerTripYoY: 0, activeTravellerPct: 0,
      topCorridor: 'N/A', secondCorridor: 'N/A', corridorShareTop: 0, corridorShareSecond: 0,
      top3Corridors: [], topPersona: 'Everyday Essentialist', topAffluentTier: 'Non-Affluent',
      personaDistribution: [], affluentDistribution: [],
      decileDistribution: {}, tierDistribution: {} as Record<CardTier, number>,
      dfmcDistribution: {} as Record<DfmcSegment, number>,
    };
  }

  const n = cardholders.length;
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const corridorCount: Record<string, number> = {};
  const personaCount: Record<string, number> = {};
  const affluentCount: Record<string, number> = {};
  const decileCount: Record<number, number> = {};
  const tierCount: Partial<Record<CardTier, number>> = {};
  const dfmcCount: Partial<Record<DfmcSegment, number>> = {};

  cardholders.forEach((ch) => {
    corridorCount[ch.l12m_spend_top_corridor] = (corridorCount[ch.l12m_spend_top_corridor] || 0) + 1;
    personaCount[ch.consumer_persona] = (personaCount[ch.consumer_persona] || 0) + 1;
    affluentCount[ch.affluent_persona] = (affluentCount[ch.affluent_persona] || 0) + 1;
    const d = ch.active_xb_ind === 'Active Traveller'
      ? ch.travel_next3mnth_prob_active_xb_cp_decile
      : ch.travel_next3mnth_prob_inactive_xb_cp_decile;
    decileCount[d] = (decileCount[d] || 0) + 1;
    tierCount[ch.card_tier] = (tierCount[ch.card_tier] || 0) + 1;
    dfmcCount[ch.dfmc_segment] = (dfmcCount[ch.dfmc_segment] || 0) + 1;
  });

  const sortedCorridors = Object.entries(corridorCount).sort((a, b) => b[1] - a[1]);
  const topCorridorEntry = sortedCorridors[0];
  const secondCorridorEntry = sortedCorridors[1];
  const topPersonaEntry = Object.entries(personaCount).sort((a, b) => b[1] - a[1])[0];
  const topAffluentEntry = Object.entries(affluentCount).sort((a, b) => b[1] - a[1])[0];

  const avgSpendXb = Math.round(sum(cardholders.map(c => c.l12m_spend_xb_cp)) / n);
  const avgTrxXb = parseFloat((sum(cardholders.map(c => c.l12m_trx_xb_cp)) / n).toFixed(1));
  const avgSpendPerTrip = avgTrxXb > 0
    ? Math.round(sum(cardholders.map(c => c.l12m_avg_spend_pertrip_xb_cp)) / n)
    : 0;
  const avgYoY = parseFloat((sum(cardholders.map(c => c.l12m_spend_xb_cp_yoy)) / n * 100).toFixed(1));
  // Per-trip spend YoY is approximated as slightly lower than total XB YoY (trip frequency drives some growth)
  const avgSpendPerTripYoY = parseFloat((avgYoY * 0.65).toFixed(1));

  const top3Corridors: CorridorShare[] = sortedCorridors.slice(0, 3).map(([code, cnt]) => ({
    code,
    sharePct: parseFloat(((cnt / n) * 100).toFixed(1)),
  }));

  const sortedPersonas = Object.entries(personaCount).sort((a, b) => b[1] - a[1]);
  const sortedAffluent = Object.entries(affluentCount).sort((a, b) => b[1] - a[1]);

  return {
    count: n,
    avgSpendAll: Math.round(sum(cardholders.map(c => c.l12m_spend_all)) / n),
    avgSpendXb,
    avgSpendPerTrip,
    avgTrxXb,
    avgTravelProbActive: parseFloat((sum(cardholders.map(c => c.travel_next3mnth_prob_active_xb_cp)) / n * 100).toFixed(1)),
    avgTravelProbInactive: parseFloat((sum(cardholders.map(c => c.travel_next3mnth_prob_inactive_xb_cp)) / n * 100).toFixed(1)),
    avgXbShare: parseFloat((sum(cardholders.map(c => c.l12m_spend_xb_cp / (c.l12m_spend_all || 1))) / n * 100).toFixed(1)),
    avgYoY,
    avgSpendPerTripYoY,
    activeTravellerPct: parseFloat((cardholders.filter(c => c.active_xb_ind === 'Active Traveller').length / n * 100).toFixed(1)),
    topCorridor: topCorridorEntry?.[0] ?? 'N/A',
    secondCorridor: secondCorridorEntry?.[0] ?? 'N/A',
    corridorShareTop: topCorridorEntry ? parseFloat(((topCorridorEntry[1] / n) * 100).toFixed(1)) : 0,
    corridorShareSecond: secondCorridorEntry ? parseFloat(((secondCorridorEntry[1] / n) * 100).toFixed(1)) : 0,
    top3Corridors,
    topPersona: (sortedPersonas[0]?.[0] ?? 'Everyday Essentialist') as ConsumerPersona,
    topAffluentTier: (sortedAffluent[0]?.[0] ?? 'Non-Affluent') as AffluentPersona,
    personaDistribution: sortedPersonas.map(([persona, cnt]) => ({
      persona: persona as ConsumerPersona,
      pct: parseFloat(((cnt / n) * 100).toFixed(1)),
    })),
    affluentDistribution: sortedAffluent.map(([tier, cnt]) => ({
      tier: tier as AffluentPersona,
      pct: parseFloat(((cnt / n) * 100).toFixed(1)),
    })),
    decileDistribution: decileCount,
    tierDistribution: tierCount as Record<CardTier, number>,
    dfmcDistribution: dfmcCount as Record<DfmcSegment, number>,
  };
}

export const ALL_TIERS: CardTier[] = ['Classic', 'Gold', 'Platinum', 'Signature', 'Infinite'];
export const ALL_DFMC: DfmcSegment[] = ['Top of Wallet', 'High Potential', 'Average Potential', 'Selective'];
export const ALL_PERSONAS: ConsumerPersona[] = PERSONAS;
export const ALL_AFFLUENT: AffluentPersona[] = AFFLUENT;
export const ALL_CORRIDORS = CORRIDORS;
export const ALL_MARKETS = MARKETS;

// ── Sample CSV generation ─────────────────────────────────────────────────────
// Generates a 98,000-row CSV with 95% card hashes matching the dataset
// and 5% fabricated (unmatched) hashes. Realistic credit/limit/utilisation values.

export const SAMPLE_CSV_TOTAL = 98_000;
export const SAMPLE_CSV_MATCHED = Math.round(SAMPLE_CSV_TOTAL * 0.95); // 93,100
export const SAMPLE_CSV_UNMATCHED = SAMPLE_CSV_TOTAL - SAMPLE_CSV_MATCHED; // 4,900

function fakeCsvHash(index: number): string {
  // Fabricate a hash that will never appear in CARDHOLDER_DATASET
  const prefix = 'deadbeef';
  return (prefix + String(index).padStart(56, '0')).slice(0, 64);
}

function csvCreditRow(hash: string, rng: () => number): string {
  const creditLimit = (Math.floor(rng() * 19) + 1) * 5_000_000;
  const utilPct = parseFloat((rng() * 100).toFixed(2));
  const remaining = Math.round(creditLimit * (1 - utilPct / 100));
  const consent = rng() > 0.15 ? 1 : 0;
  const status = rng() > 0.08 ? 'active' : 'blocked';
  return `${hash},${creditLimit},${remaining},${utilPct},${consent},${status}`;
}

export function generateSampleCsvText(): string {
  const rng = seededRandom(99);
  const lines: string[] = ['card_hash_sha256,credit_limit,remaining_limit,utilisation_pct,consent_flag,card_status'];

  // 95% matched — pick first SAMPLE_CSV_MATCHED hashes from dataset (cycling if needed)
  for (let i = 0; i < SAMPLE_CSV_MATCHED; i++) {
    const hash = CARDHOLDER_DATASET[i % CARDHOLDER_DATASET.length].card_hash_sha256;
    lines.push(csvCreditRow(hash, rng));
  }

  // 5% unmatched — fabricated hashes
  for (let i = 0; i < SAMPLE_CSV_UNMATCHED; i++) {
    lines.push(csvCreditRow(fakeCsvHash(i), rng));
  }

  return lines.join('\n');
}