'use client';
import { useRef } from 'react';
import Button from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Campaign, SimulationResult, AiRecommendation } from '@/lib/supabase';
import { formatIDR, formatCount } from '@/lib/utils';

interface Props {
  campaign: Campaign;
  inputs?: {
    data_source: string;
    segment_data: Record<string, unknown>;
    mechanics_config: Record<string, unknown>;
    assumptions: Record<string, unknown>;
  } | null;
  result?: SimulationResult | null;
  issuerName: string;
}

export default function CampaignExport({ campaign, inputs, result, issuerName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>${campaign.name} — Campaign Brief</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 32px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
            th { background: #f8fafc; padding: 8px 12px; text-align: left; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; }
            td { padding: 8px 12px; border: 1px solid #e2e8f0; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .kpi-label { font-size: 11px; color: #94a3b8; }
            .kpi-value { font-size: 18px; font-weight: 700; color: #1e293b; }
            .rec { padding: 10px 14px; border-left: 3px solid #3b82f6; background: #f8fafc; margin-bottom: 8px; font-size: 13px; }
            .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  }

  const seg = inputs?.segment_data as Record<string, unknown> | undefined;
  const mech = inputs?.mechanics_config as Record<string, unknown> | undefined;
  const asmp = inputs?.assumptions as Record<string, unknown> | undefined;

  return (
    <>
      <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handlePrint}>
        Export Brief
      </Button>

      <div ref={printRef} className="hidden">
        <h1>{campaign.name}</h1>
        <h2>
          Campaign Brief — {issuerName} &nbsp;|&nbsp;{' '}
          {new Date(campaign.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>

        {result && (
          <>
            <h3>Key Performance Projections</h3>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Projected ROI</div>
                <div className="kpi-value">{result.projected_roi.toFixed(1)}%</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total Budget</div>
                <div className="kpi-value">{formatIDR(result.projected_budget)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Activated Cardholders</div>
                <div className="kpi-value">{formatCount(result.projected_activated_cardholders)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Cost per Cardholder</div>
                <div className="kpi-value">{formatIDR(Math.round(result.cost_per_cardholder))}</div>
              </div>
            </div>
          </>
        )}

        {seg && (
          <>
            <h3>Segment Details</h3>
            <table>
              <thead>
                <tr><th>Parameter</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Segment Name</td><td>{String(seg.segment_name || '—')}</td></tr>
                <tr><td>Audience Size</td><td>{formatCount(Number(seg.audience_size || 0))} cardholders</td></tr>
                <tr><td>Avg Monthly Spend</td><td>{formatIDR(Number(seg.avg_monthly_spend || 0))}</td></tr>
                <tr><td>Segment Type</td><td>{String(seg.segment_type || '—')}</td></tr>
                <tr><td>Data Source</td><td>{inputs?.data_source || '—'}</td></tr>
              </tbody>
            </table>
          </>
        )}

        {mech && (
          <>
            <h3>Campaign Mechanics</h3>
            <table>
              <thead>
                <tr><th>Parameter</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Campaign Type</td><td>{String(mech.campaign_type || '—')}</td></tr>
                <tr><td>Spend Threshold</td><td>{formatIDR(Number(mech.spend_threshold || 0))}</td></tr>
                <tr><td>Reward Type</td><td>{String(mech.reward_type || '—')}</td></tr>
                <tr><td>Reward Value</td><td>{String(mech.reward_value || '—')}{mech.reward_type === 'cashback' ? '%' : ''}</td></tr>
                <tr><td>Duration</td><td>{String(mech.duration_days || '—')} days</td></tr>
              </tbody>
            </table>
          </>
        )}

        {asmp && (
          <>
            <h3>Simulation Assumptions</h3>
            <table>
              <thead>
                <tr><th>Assumption</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Take-up Rate</td><td>{String(asmp.take_up_rate || '—')}%</td></tr>
                <tr><td>Control Group</td><td>{String(asmp.control_group_pct || '—')}%</td></tr>
                <tr><td>Incremental Spend Lift</td><td>{String(asmp.incremental_spend_lift || '—')}%</td></tr>
                <tr><td>Avg Transactions / Month</td><td>{String(asmp.avg_transactions_per_month || '—')}</td></tr>
              </tbody>
            </table>
          </>
        )}

        {result && (
          <>
            <h3>Financial Summary</h3>
            <table>
              <thead>
                <tr><th>Metric</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Total Budget</td><td>{formatIDR(result.projected_budget)}</td></tr>
                <tr><td>Projected ROI</td><td>{result.projected_roi.toFixed(2)}%</td></tr>
                <tr><td>Spend Uplift</td><td>{result.projected_uplift_pct.toFixed(2)}%</td></tr>
                <tr><td>Activated Cardholders</td><td>{formatCount(result.projected_activated_cardholders)}</td></tr>
                <tr><td>Cost per Cardholder</td><td>{formatIDR(Math.round(result.cost_per_cardholder))}</td></tr>
              </tbody>
            </table>
          </>
        )}

        {result?.ai_recommendations && (result.ai_recommendations as AiRecommendation[]).length > 0 && (
          <>
            <h3>AI Recommendations</h3>
            {(result.ai_recommendations as AiRecommendation[]).map((rec, i) => (
              <div key={i} className="rec">
                <strong>{rec.title}</strong> ({rec.type}, {rec.impact} impact)
                <br />
                {rec.description}
              </div>
            ))}
          </>
        )}

        <div className="footer">
          Generated by Campaign Decisioning Studio &nbsp;|&nbsp; Powered by Visa &nbsp;|&nbsp;{' '}
          {new Date().toLocaleString()}
        </div>
      </div>
    </>
  );
}
