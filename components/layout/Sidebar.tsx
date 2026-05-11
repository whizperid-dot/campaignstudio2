'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CirclePlus as PlusCircle, History, Database, LogOut, ChevronRight } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Issuer } from '@/lib/supabase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns/new', label: 'New Campaign', icon: PlusCircle },
  { href: '/campaigns', label: 'Campaign History', icon: History },
  { href: '/vif-subscriptions', label: 'VIF Subscriptions', icon: Database },
];

export default function Sidebar({ issuer }: { issuer: Issuer }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40" style={{ background: '#07143a', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <img
            src="/Visa_Inc._logo_(2021–present).svg"
            alt="Visa"
            className="h-6 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div className="w-px h-5 opacity-30" style={{ background: '#fff' }} />
          <div>
            <p className="text-white text-xs font-semibold leading-tight tracking-wide">Campaign</p>
            <p className="text-xs font-semibold leading-tight tracking-wide" style={{ color: '#f7b600' }}>Decisioning Studio</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/campaigns'
              ? pathname === '/campaigns'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'text-white'
                  : 'text-blue-200/60 hover:text-white'
              }`}
              style={isActive ? { background: 'rgba(20,52,203,0.5)', border: '1px solid rgba(20,52,203,0.7)' } : { border: '1px solid transparent' }}
            >
              <Icon
                size={16}
                className={isActive ? 'text-white' : 'text-blue-300/50 group-hover:text-blue-200'}
              />
              {item.label}
              {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="px-3 py-2.5 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: '#1434cb' }}
            >
              {issuer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{issuer.name}</p>
              <p className="text-xs" style={{ color: '#f7b600' }}>
                Issuer Partner{issuer.portfolio ? ` · ${issuer.portfolio}` : ''}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
