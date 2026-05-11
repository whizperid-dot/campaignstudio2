'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { getSession } from '@/lib/auth';
import { supabase, Campaign, SimulationResult } from '@/lib/supabase';
import { CirclePlus as PlusCircle, TrendingUp, DollarSign, Activity, ChevronRight, Users, ArrowUpRight, Clock, CircleCheck as CheckCircle2, Rocket, ChartBar as BarChart2, Trash2, X, TriangleAlert as AlertTriangle, Pencil, Target } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatIDR, formatCount } from '@/lib/utils';
import AiCampaignRecommendations from '@/components/dashboard/AiCampaignRecommendations';

type CampaignWithSim = Campaign & { simulation_results?: SimulationResult | null };

function statusVariant(status: string): 'neutral' | 'info' | 'success' | 'gold' {
  switch (status) {
    case 'draft': return 'neutral';
    case 'simulated': return 'info';
    case 'launched': return 'success';
    case 'completed': return 'gold';
    default: return 'neutral';
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'draft': return <Clock size={13} style={{ color: '#8894b4' }} />;
    case 'simulated': return <BarChart2 size={13} style={{ color: '#1434cb' }} />;
    case 'launched': return <Rocket size={13} style={{ color: '#16a34a' }} />;
    case 'completed': return <CheckCircle2 size={13} style={{ color: '#f7b600' }} />;
    default: return null;
  }
}

function DeleteConfirmModal({ campaign, onConfirm, onCancel }: {
  campaign: CampaignWithSim;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(7,20,58,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onCancel}
    >
      <div
        className="relative rounded-2xl w-full mx-4 p-6"
        style={{ maxWidth: 400, background: '#fff', boxShadow: '0 24px 64px rgba(7,20,58,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={14} style={{ color: '#8894b4' }} />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(220,38,38,0.08)' }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
        </div>
        <h3 className="text-sm font-bold mb-1" style={{ color: '#07143a' }}>Delete campaign?</h3>
        <p className="text-xs leading-relaxed mb-1" style={{ color: '#4a5578' }}>
          <span className="font-semibold">&ldquo;{campaign.name}&rdquo;</span> and all its simulation data will be permanently deleted.
        </p>
        <p className="text-xs mb-6" style={{ color: '#8894b4' }}>This action cannot be undone.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: '#f7f9fc', color: '#4a5578', border: '1px solid rgba(221,227,245,0.8)' }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
            }}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#dc2626', color: '#fff' }}
          >
            {deleting
              ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <Trash2 size={12} />
            }
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignWithSim[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignWithSim | null>(null);

  useEffect(() => {
    const issuer = getSession();
    if (!issuer) { router.replace('/login'); return; }
    supabase
      .from('campaigns')
      .select('*, simulation_results(*)')
      .eq('issuer_id', issuer.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as CampaignWithSim[]) || []);
        setLoading(false);
      });
  }, [router]);

  async function handleDelete(campaign: CampaignWithSim) {
    // Optimistically remove from UI first
    setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
    setDeletingCampaign(null);
    // Then delete from DB (fire and forget — UI already updated)
    await supabase.from('simulation_results').delete().eq('campaign_id', campaign.id);
    await supabase.from('campaigns').delete().eq('id', campaign.id);
  }

  const issuer = getSession();
  const totalCampaigns = campaigns.length;
  const simulatedCampaigns = campaigns.filter((c) =>
    ['simulated', 'launched', 'completed'].includes(c.status)
  );
  const avgRoi =
    simulatedCampaigns.length > 0
      ? simulatedCampaigns.reduce((acc, c) => acc + (c.simulation_results?.projected_roi || 0), 0) /
        simulatedCampaigns.length
      : 0;
  const totalBudget = simulatedCampaigns.reduce(
    (acc, c) => acc + (c.simulation_results?.projected_budget || 0),
    0
  );
  const totalLeads = simulatedCampaigns.reduce(
    (acc, c) => acc + (c.simulation_results?.projected_activated_cardholders || 0),
    0
  );
  const totalSpendUplift = simulatedCampaigns.reduce((acc, c) => {
    const sd = c.simulation_results?.sensitivity_data as Record<string, unknown> | undefined;
    return acc + (Number(sd?.incremental_revenue) || 0);
  }, 0);

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#07143a' }}>
              Welcome back, {issuer?.email?.split('@')[0] ? issuer.email.split('@')[0].charAt(0).toUpperCase() + issuer.email.split('@')[0].slice(1) : issuer?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm" style={{ color: '#4a5578' }}>
              {issuer?.name} &middot; Issuer Partner{issuer?.portfolio ? ` \u00b7 ${issuer.portfolio}` : ''}
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-full transition-all"
            style={{ background: '#1434cb', border: '1.5px solid #1434cb' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0e2490')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1434cb')}
          >
            <PlusCircle size={15} />
            New Campaign
            <ChevronRight size={13} style={{ color: '#f7b600' }} />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <Card padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8894b4' }}>Total Campaigns</p>
                <p className="text-2xl font-bold" style={{ color: '#07143a' }}>{totalCampaigns}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                <Activity size={18} style={{ color: '#1434cb' }} />
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8894b4' }}>Total Leads Generated</p>
                <p className="text-2xl font-bold" style={{ color: '#1434cb' }}>{formatCount(totalLeads)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                <Users size={18} style={{ color: '#1434cb' }} />
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8894b4' }}>Total Est. Budget</p>
                <p className="text-2xl font-bold" style={{ color: '#07143a' }}>
                  {formatIDR(totalBudget)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <DollarSign size={18} style={{ color: '#d97706' }} />
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8894b4' }}>Total Est. Spend Uplift</p>
                <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                  {formatIDR(totalSpendUplift)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <TrendingUp size={18} style={{ color: '#16a34a' }} />
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8894b4' }}>Avg. Est. ROI</p>
                <p className="text-2xl font-bold" style={{ color: avgRoi >= 0 ? '#16a34a' : '#dc2626' }}>
                  {avgRoi >= 0 ? '+' : ''}{avgRoi.toFixed(0)}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <TrendingUp size={18} style={{ color: '#16a34a' }} />
              </div>
            </div>
          </Card>
        </div>

        {/* AI Campaign Recommendations */}
        <AiCampaignRecommendations />

        {/* Recent Campaigns */}
        <Card padding="none" className="mt-8">
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#dde3f5' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#07143a' }}>Recent Campaigns</h2>
            <Link
              href="/campaigns"
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: '#1434cb' }}
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#eff6ff' }}>
                <Target size={20} style={{ color: '#1434cb' }} />
              </div>
              <p className="font-medium mb-1" style={{ color: '#07143a' }}>No campaigns yet</p>
              <p className="text-sm mb-4" style={{ color: '#8894b4' }}>Create your first campaign to get started</p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-full transition-all"
                style={{ background: '#1434cb', border: '1.5px solid #1434cb' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0e2490')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1434cb')}
              >
                <PlusCircle size={15} />
                New Campaign
                <ChevronRight size={13} style={{ color: '#f7b600' }} />
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#f0f3fb' }}>
              {campaigns.slice(0, 6).map((c) => (
                <div key={c.id} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#f8f9fc]">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <StatusIcon status={c.status} />
                        <p className="text-sm font-medium truncate" style={{ color: '#07143a' }}>{c.name}</p>
                      </div>
                      <p className="text-xs" style={{ color: '#8894b4' }}>
                        {new Date(c.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.simulation_results && (() => {
                        const sd = c.simulation_results.sensitivity_data as Record<string, unknown> | undefined;
                        const spendUplift = Number(sd?.incremental_revenue) || 0;
                        const roiPos = c.simulation_results.projected_roi >= 0;
                        return (
                          <>
                            <div className="text-right rounded-xl px-3 py-1.5" style={{ background: '#fafbfe' }}>
                              <p className="text-xs" style={{ color: '#b0bdd6' }}>Leads</p>
                              <p className="text-sm font-bold" style={{ color: '#1434cb' }}>
                                {formatCount(c.simulation_results.projected_activated_cardholders)}
                              </p>
                            </div>
                            <div className="text-right rounded-xl px-3 py-1.5" style={{ background: '#fafbfe' }}>
                              <p className="text-xs" style={{ color: '#b0bdd6' }}>Est. Budget</p>
                              <p className="text-sm font-bold" style={{ color: '#07143a' }}>
                                {formatIDR(c.simulation_results.projected_budget)}
                              </p>
                            </div>
                            {spendUplift > 0 && (
                              <div className="text-right rounded-xl px-3 py-1.5" style={{ background: '#fafbfe' }}>
                                <p className="text-xs" style={{ color: '#b0bdd6' }}>Spend Uplift</p>
                                <p className="text-sm font-bold" style={{ color: '#16a34a' }}>
                                  {formatIDR(spendUplift)}
                                </p>
                              </div>
                            )}
                            <div className="text-right rounded-xl px-3 py-1.5" style={{ background: '#fafbfe' }}>
                              <p className="text-xs" style={{ color: '#b0bdd6' }}>Est. ROI</p>
                              <p className="text-sm font-bold" style={{ color: roiPos ? '#16a34a' : '#dc2626' }}>
                                {roiPos ? '+' : ''}{c.simulation_results.projected_roi.toFixed(0)}%
                              </p>
                            </div>
                          </>
                        );
                      })()}
                      <Badge variant={statusVariant(c.status)}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                      <ArrowUpRight size={14} style={{ color: '#dde3f5' }} />
                    </div>
                  </Link>
                  {/* Action buttons — visible on row hover */}
                  <Link
                    href={`/campaigns/${c.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                    title="Edit campaign"
                  >
                    <Pencil size={13} style={{ color: '#1434cb' }} />
                  </Link>
                  <button
                    onClick={e => { e.preventDefault(); setDeletingCampaign(c); }}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    title="Delete campaign"
                  >
                    <Trash2 size={13} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {deletingCampaign && (
        <DeleteConfirmModal
          campaign={deletingCampaign}
          onConfirm={() => handleDelete(deletingCampaign)}
          onCancel={() => setDeletingCampaign(null)}
        />
      )}
    </AppShell>
  );
}
