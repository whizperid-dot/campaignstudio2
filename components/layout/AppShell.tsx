'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Issuer } from '@/lib/supabase';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      setLoading(false);
    } else {
      setIssuer(session);
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fc' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1434cb', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#4a5578' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!issuer) return null;

  return (
    <div className="min-h-screen flex" style={{ background: '#f8f9fc' }}>
      <Sidebar issuer={issuer} />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  );
}
