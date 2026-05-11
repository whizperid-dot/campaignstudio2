'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight,
  AlertTriangle,
  Info,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { SimulationResult, AiRecommendation } from '@/lib/supabase';
import { formatIDR, formatCount } from '@/lib/utils';

interface Props {
  result: SimulationResult;
  assumptions?: { take_up_rate: number; control_group_pct: number; incremental_spend_lift: number };
}

const recTypeConfig: Record<string, { icon: LucideIcon; color: string; bg: string; border: string; badge: 'warning' | 'info' | 'neutral' | 'success' }> = {
  warning: {
    icon: AlertTriangle,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'warning',
  },
  optimization: {
    icon: TrendingUp,
    color: '#1434cb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: 'info',
  },
  benchmark: {
    icon: Info,
    color: '#8894b4',
    bg: '#f0f3fb',
    border: '#dde3f5',
    badge: 'neutral',
  },
  suggestion: {
    icon: Lightbulb,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'success',
  },
};

const impactColor = { high: 'error', medium: 'warning', low: 'neutral' } as const;

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
}

function MetricCard({ label, value, subtext, icon: Icon, iconColor, iconBg, valueColor }: MetricCardProps) {
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: '#8894b4' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: valueColor || '#07143a' }}>{value}</p>
          {subtext && <p className="text-xs mt-0.5" style={{ color: '#8894b4' }}>{subtext}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
    </Card>
  );
}

export default function SimulationDashboard({ result }: Props) {
  const sensitivity = (result.sensitivity_data?.sensitivity as Array<{
    take_up_rate: number;
    roi: number;
    budget: number;
    activated_cardholders: number;
  }>) || [];

  const recs = result.ai_recommendations as AiRecommendation[];

  // sensitivity_data blob also carries extra scalar fields from runSimulation
  const extras = result.sensitivity_data as {
    incremental_revenue?: number;
    uplift_per_cardholder_idr?: number;
    total_reward_payout?: number;
    break_even_spend_lift?: number;
    break_even_take_up_rate?: number;  // legacy alias
  };

  const totalSpendUplift = extras?.incremental_revenue || 0;
  const upliftPerCH = extras?.uplift_per_cardholder_idr || 0;
  const rewardBudget = extras?.total_reward_payout || result.projected_budget || 0;
  const breakEvenLift = extras?.break_even_spend_lift ?? extras?.break_even_take_up_rate ?? 0;

  const roiColor =
    result.projected_roi >= 100
      ? '#16a34a'
      : result.projected_roi >= 0
      ? '#1434cb'
      : '#dc2626';

  const budgetData = [
    { name: 'Reward Budget',    value: rewardBudget,       fill: '#1434cb' },
    { name: 'Total Spend Uplift', value: totalSpendUplift, fill: '#16a34a' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Projected ROI"
          value={`${result.projected_roi >= 0 ? '+' : ''}${result.projected_roi.toFixed(1)}%`}
          subtext="Spend uplift ÷ reward budget"
          icon={TrendingUp}
          iconColor={roiColor}
          iconBg={result.projected_roi >= 0 ? '#f0fdf4' : '#fef2f2'}
          valueColor={roiColor}
        />
        <MetricCard
          label="Spend Uplift / Cardholder"
          value={upliftPerCH > 0 ? formatIDR(upliftPerCH) : '—'}
          subtext="Avg incremental travel spend per CH"
          icon={ArrowUpRight}
          iconColor="#16a34a"
          iconBg="#f0fdf4"
        />
        <MetricCard
          label="Reward Budget"
          value={formatIDR(rewardBudget)}
          subtext="Total reward payout"
          icon={DollarSign}
          iconColor="#1434cb"
          iconBg="#eff6ff"
        />
        <MetricCard
          label="Activated Cardholders"
          value={formatCount(result.projected_activated_cardholders)}
          subtext="Expected to meet threshold"
          icon={Users}
          iconColor="#d97706"
          iconBg="#fffbeb"
        />
      </div>

      {/* Spend uplift vs reward summary bar */}
      {totalSpendUplift > 0 && rewardBudget > 0 && (
        <Card padding="sm">
          <p className="text-xs font-semibold mb-2" style={{ color: '#4a5578' }}>Spend Uplift vs Reward Budget</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#dde3f5' }}>
              {/* Show reward budget as reference bar (always full width = reward) */}
              {(() => {
                const max = Math.max(totalSpendUplift, rewardBudget);
                const upliftPct = Math.min(100, (totalSpendUplift / max) * 100);
                const budgetPct = Math.min(100, (rewardBudget / max) * 100);
                return (
                  <div className="relative h-full">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: `${upliftPct}%`, background: result.projected_roi >= 0 ? '#16a34a' : '#dc2626' }}
                    />
                    <div
                      className="absolute left-0 top-0 h-full rounded-full opacity-30"
                      style={{ width: `${budgetPct}%`, background: '#1434cb' }}
                    />
                  </div>
                );
              })()}
            </div>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: roiColor }}>
              {result.projected_roi >= 0 ? '+' : ''}{result.projected_roi.toFixed(0)}% ROI
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: result.projected_roi >= 0 ? '#16a34a' : '#dc2626' }} />
              <span className="text-xs" style={{ color: '#4a5578' }}>
                Spend Uplift: {formatIDR(totalSpendUplift)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1434cb', opacity: 0.5 }} />
              <span className="text-xs" style={{ color: '#4a5578' }}>
                Reward: {formatIDR(rewardBudget)}
              </span>
            </div>
            {breakEvenLift > 0 && (
              <div className="ml-auto">
                <span className="text-xs" style={{ color: '#8894b4' }}>
                  Break-even lift: <strong style={{ color: '#d97706' }}>{breakEvenLift.toFixed(1)}%</strong>
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Sensitivity Chart */}
      {sensitivity.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-1" style={{ color: '#07143a' }}>ROI vs Take-up Rate</p>
          <p className="text-xs mb-4" style={{ color: '#8894b4' }}>
            Total spend uplift is measured across the full target audience — ROI improves as fewer reward payouts are made (lower take-up = lower budget denominator)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sensitivity} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde3f5" />
              <XAxis
                dataKey="take_up_rate"
                tick={{ fill: '#8894b4', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis tick={{ fill: '#8894b4', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #dde3f5',
                  borderRadius: 8,
                  color: '#07143a',
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(7,20,58,0.08)',
                }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'ROI']}
                labelFormatter={(l) => `Take-up: ${l}%`}
              />
              <ReferenceLine y={0} stroke="#dde3f5" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="roi"
                stroke="#1434cb"
                strokeWidth={2}
                dot={{ fill: '#1434cb', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Financial Breakdown */}
      <Card>
        <p className="text-sm font-semibold mb-4" style={{ color: '#07143a' }}>Financial Breakdown</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={budgetData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: '#8894b4', fontSize: 10 }}
              tickFormatter={(v) => formatIDR(v).replace('IDR ', '')}
            />
            <YAxis type="category" dataKey="name" tick={{ fill: '#4a5578', fontSize: 11 }} width={140} />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #dde3f5',
                borderRadius: 8,
                color: '#07143a',
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(7,20,58,0.08)',
              }}
              formatter={(v: number) => [formatIDR(v)]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {budgetData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t" style={{ borderColor: '#dde3f5' }}>
          <div>
            <p className="text-xs" style={{ color: '#8894b4' }}>Reward Budget</p>
            <p className="text-sm font-semibold" style={{ color: '#1434cb' }}>
              {formatIDR(rewardBudget)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#8894b4' }}>Total Spend Uplift</p>
            <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
              {formatIDR(totalSpendUplift)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#8894b4' }}>Uplift / Cardholder</p>
            <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
              {upliftPerCH > 0 ? formatIDR(upliftPerCH) : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* AI Suggestions */}
      {recs && recs.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#eff6ff' }}>
              <Lightbulb size={13} style={{ color: '#1434cb' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#07143a' }}>AI Suggestions</p>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium ml-auto" style={{ background: '#f0f3fb', color: '#8894b4', border: '1px solid #dde3f5' }}>
              {recs.length} insight{recs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {recs.map((rec, i) => {
              const config = recTypeConfig[rec.type] || recTypeConfig.benchmark;
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: config.bg, border: `1px solid ${config.border}` }}
                >
                  <Icon size={15} className="flex-shrink-0 mt-0.5" style={{ color: config.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: '#07143a' }}>{rec.title}</p>
                      <Badge variant={config.badge}>{rec.type}</Badge>
                      <Badge variant={impactColor[rec.impact]}>{rec.impact} impact</Badge>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#4a5578' }}>{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
