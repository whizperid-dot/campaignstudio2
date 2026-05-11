'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { VIF_PACKAGES } from '@/lib/vif-mock-data';
import {
  Globe,
  TrendingUp,
  Shield,
  Lock,
  UserPlus,
  CheckCircle2,
  XCircle,
  Info,
  type LucideIcon,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const ICONS: Record<string, LucideIcon> = {
  Globe,
  TrendingUp,
  Shield,
  Lock,
  UserPlus,
};

const COLOR_MAP: Record<string, {
  bg: string; border: string; text: string;
  iconBg: string; iconBorder: string;
  badge: 'info' | 'success' | 'warning' | 'error' | 'neutral';
}> = {
  blue:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1434cb', iconBg: '#eff6ff', iconBorder: '#bfdbfe', badge: 'info' },
  teal:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', iconBg: '#f0fdf4', iconBorder: '#bbf7d0', badge: 'success' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', iconBg: '#fffbeb', iconBorder: '#fde68a', badge: 'warning' },
  red:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', iconBg: '#fef2f2', iconBorder: '#fecaca', badge: 'error' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', iconBg: '#f0fdf4', iconBorder: '#bbf7d0', badge: 'success' },
};

export default function VifSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const issuer = getSession();
    if (!issuer) { router.replace('/login'); return; }
    loadSubscriptions(issuer.id);
  }, [router]);

  async function loadSubscriptions(issuerId: string) {
    const { data } = await supabase
      .from('vif_subscriptions')
      .select('*')
      .eq('issuer_id', issuerId);
    const map: Record<string, boolean> = {};
    (data || []).forEach((sub: { package_name: string; is_active: boolean }) => {
      map[sub.package_name] = sub.is_active;
    });
    setSubscriptions(map);
    setLoading(false);
  }

  const activeCount = Object.values(subscriptions).filter(Boolean).length;

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#07143a' }}>VIF Subscriptions</h1>
          <p className="text-sm" style={{ color: '#4a5578' }}>
            Visa Insights Feed (VIF) packages available to your issuer account.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#1434cb' }} />
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: '#07143a' }}>
              {activeCount} of {VIF_PACKAGES.length} packages active
            </p>
            <p className="text-xs" style={{ color: '#4a5578' }}>
              Active VIF packages unlock pre-built cardholder segments in the campaign wizard. Contact your Visa account manager to subscribe to additional packages.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {VIF_PACKAGES.map((pkg) => {
              const isActive = subscriptions[pkg.name] === true;
              const colors = COLOR_MAP[pkg.color] || COLOR_MAP.blue;
              const Icon = ICONS[pkg.icon] || Globe;

              return (
                <Card key={pkg.name} className={`transition-all ${!isActive ? 'opacity-70' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}
                    >
                      <Icon size={22} style={{ color: colors.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold" style={{ color: '#07143a' }}>{pkg.fullName}</h3>
                        <Badge variant={isActive ? colors.badge : 'neutral'}>
                          {isActive ? 'Active' : 'Not subscribed'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3" style={{ color: '#4a5578' }}>{pkg.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {pkg.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                            style={isActive
                              ? { background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }
                              : { background: '#f0f3fb', color: '#8894b4', border: '1px solid #dde3f5' }
                            }
                          >
                            {isActive ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <XCircle size={11} />
                            )}
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isActive ? (
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                        >
                          <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                          <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Active</span>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ background: '#f0f3fb', border: '1px solid #dde3f5' }}
                        >
                          <Lock size={13} style={{ color: '#8894b4' }} />
                          <span className="text-xs font-medium" style={{ color: '#8894b4' }}>Contact Visa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
