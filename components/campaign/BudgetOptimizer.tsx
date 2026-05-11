'use client';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button';
import { FileSliders as Sliders } from 'lucide-react';
import { runBudgetOptimization, SegmentData, MechanicsConfig, Assumptions } from '@/lib/simulation';
import { formatIDR, formatCount } from '@/lib/utils';

interface Props {
  segment: SegmentData;
  mechanics: MechanicsConfig;
  assumptions: Assumptions;
}

export default function BudgetOptimizer({ segment, mechanics, assumptions }: Props) {
  const [budget, setBudget] = useState(50000000);
  const [result, setResult] = useState<ReturnType<typeof runBudgetOptimization> | null>(null);

  function handleOptimize() {
    const res = runBudgetOptimization(budget, segment, mechanics, assumptions);
    setResult(res);
  }

  const pct = ((budget - 5000000) / (500000000 - 5000000)) * 100;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Sliders size={15} style={{ color: '#1434cb' }} />
        <p className="text-sm font-semibold" style={{ color: '#07143a' }}>Budget Optimizer</p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: '#8894b4' }}>Max Budget</p>
            <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
              {formatIDR(budget)}
            </p>
          </div>
          <div className="relative">
            <div className="h-1.5 rounded-full relative" style={{ background: '#dde3f5' }}>
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: '#1434cb' }}
              />
            </div>
            <input
              type="range"
              min={5000000}
              max={500000000}
              step={5000000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: '#8894b4' }}>
            <span>{formatIDR(5000000)}</span>
            <span>{formatIDR(500000000)}</span>
          </div>
        </div>
        <Button onClick={handleOptimize} className="w-full" size="sm">
          Optimize
        </Button>

        {result && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#dde3f5' }}>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg" style={{ background: '#f0f3fb' }}>
                <p className="text-xs" style={{ color: '#8894b4' }}>Projected ROI</p>
                <p className="text-sm font-semibold" style={{ color: result.projected_roi >= 0 ? '#16a34a' : '#dc2626' }}>
                  {result.projected_roi >= 0 ? '+' : ''}{result.projected_roi.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#f0f3fb' }}>
                <p className="text-xs" style={{ color: '#8894b4' }}>Activated CHs</p>
                <p className="text-sm font-semibold" style={{ color: '#07143a' }}>
                  {formatCount(result.projected_activated_cardholders)}
                </p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#f0f3fb' }}>
                <p className="text-xs" style={{ color: '#8894b4' }}>Rec. Take-up</p>
                <p className="text-sm font-semibold" style={{ color: '#1434cb' }}>
                  {result.recommended_take_up_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#f0f3fb' }}>
                <p className="text-xs" style={{ color: '#8894b4' }}>Reward Rate</p>
                <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                  {result.recommended_reward_value}
                  {mechanics.reward_type === 'cashback' ? '%' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
