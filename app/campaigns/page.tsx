'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { getSession } from '@/lib/auth';
import { supabase, Campaign, SimulationResult } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { CirclePlus as PlusCircle, Clock, ChartBar as BarChart2, Rocket, CircleCheck as CheckCircle2, ArrowUpRight, Search, ChevronRight, Pencil } from 'lucide-react';
import { formatIDR, formatCount } from '@/lib/utils';

type CampaignWithSim = Campaign & { simulation_results?: SimulationResult | null };

const STATUS_FILTERS = ['all', 'draft', 'simulated', 'launched', 'completed'] as const;

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

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignWithSim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const issuer = getSession();
    if (!issuer) { router.replace('/login'); return; }
    loadCampaigns(issuer.id);
  }, [router]);

  async function loadCampaigns(issuerId: string) {
    const { data } = await supabase
      .from('campaigns')
      .select('*, simulation_results(*)')
      .eq('issuer_id', issuerId)
      .order('updated_at', { ascending: false });
    setCampaigns((data as CampaignWithSim[]) || []);
    setLoading(false);
  }

  const filtered = campaigns.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#07143a' }}>Campaign History</h1>
            <p className="text-sm" style={{ color: '#4a5578' }}>All your campaigns and simulations</p>
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

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8894b4' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full rounded-lg text-sm pl-9 pr-3 py-2 transition-all outline-none"
              style={{
                background: '#fff',
                border: '1.5px solid #dde3f5',
                color: '#07143a',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
              onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#f0f3fb', border: '1px solid #dde3f5' }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
                style={
                  filter === f
                    ? { background: '#1434cb', color: '#fff' }
                    : { background: 'transparent', color: '#4a5578' }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-medium mb-1" style={{ color: '#07143a' }}>No campaigns found</p>
            <p className="text-sm" style={{ color: '#8894b4' }}>Try adjusting filters or create a new campaign.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((c) => (
              <Card
                key={c.id}
                padding="none"
                className="group transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4 px-6 py-5">
                  <Link href={`/campaigns/${c.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon status={c.status} />
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#07143a' }}>{c.name}</h3>
                        <Badge variant={statusVariant(c.status)}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs truncate mb-1" style={{ color: '#4a5578' }}>{c.description}</p>
                      )}
                      <p className="text-xs" style={{ color: '#8894b4' }}>
                        Updated{' '}
                        {new Date(c.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {c.simulation_results && (() => {
                      const sd = c.simulation_results.sensitivity_data as Record<string, unknown> | undefined;
                      const spendUplift = Number(sd?.incremental_revenue) || 0;
                      const roiPos = c.simulation_results.projected_roi >= 0;
                      return (
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right rounded-xl px-3 py-2" style={{ background: '#fafbfe' }}>
                            <p className="text-xs" style={{ color: '#b0bdd6' }}>Leads</p>
                            <p className="text-sm font-bold" style={{ color: '#1434cb' }}>
                              {formatCount(c.simulation_results.projected_activated_cardholders)}
                            </p>
                          </div>
                          <div className="text-right rounded-xl px-3 py-2" style={{ background: '#fafbfe' }}>
                            <p className="text-xs" style={{ color: '#b0bdd6' }}>Est. Budget</p>
                            <p className="text-sm font-bold" style={{ color: '#07143a' }}>
                              {formatIDR(c.simulation_results.projected_budget)}
                            </p>
                          </div>
                          {spendUplift > 0 && (
                            <div className="text-right rounded-xl px-3 py-2" style={{ background: '#fafbfe' }}>
                              <p className="text-xs" style={{ color: '#b0bdd6' }}>Spend Uplift</p>
                              <p className="text-sm font-bold" style={{ color: '#16a34a' }}>
                                {formatIDR(spendUplift)}
                              </p>
                            </div>
                          )}
                          <div className="text-right rounded-xl px-3 py-2" style={{ background: '#fafbfe' }}>
                            <p className="text-xs" style={{ color: '#b0bdd6' }}>Est. ROI</p>
                            <p className="text-sm font-bold" style={{ color: roiPos ? '#16a34a' : '#dc2626' }}>
                              {roiPos ? '+' : ''}{c.simulation_results.projected_roi.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <ArrowUpRight size={15} style={{ color: '#8894b4' }} className="flex-shrink-0" />
                  </Link>

                  {/* Edit button — visible on hover */}
                  <Link
                    href={`/campaigns/${c.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(20,52,203,0.06)', color: '#1434cb', border: '1px solid rgba(20,52,203,0.15)' }}
                    title="Edit campaign"
                  >
                    <Pencil size={12} />
                    Edit
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
