'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setPortfolio } from '@/lib/auth';
import { Issuer } from '@/lib/supabase';
import { Eye, EyeOff, CircleAlert as AlertCircle, TrendingUp, Shield, ChartBar as BarChart2, Globe, ChevronRight, CreditCard, Wallet, ArrowLeft, Check } from 'lucide-react';

type Step = 'credentials' | 'portfolio';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [issuer, setIssuer] = useState<Issuer | null>(null);

  // Credentials step state
  const [email, setEmail] = useState('hardi@nusantarabank.co.id');
  const [password, setPassword] = useState('visanusantara');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Portfolio step state
  const [selectedPortfolio, setSelectedPortfolio] = useState<'Credit' | 'Debit' | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { issuer: authedIssuer, error: loginError } = await login(email, password);
    setLoading(false);
    if (loginError || !authedIssuer) {
      setError(loginError || 'Login failed.');
    } else {
      setIssuer(authedIssuer);
      setStep('portfolio');
    }
  }

  async function handlePortfolioConfirm() {
    if (!selectedPortfolio) return;
    setConfirming(true);
    setPortfolio(selectedPortfolio);
    router.replace('/dashboard');
  }

  const features = [
    {
      icon: Globe,
      title: 'Visa Insights Feed (VIF)',
      desc: 'Access pre-built cardholder segments and AI signals across card lifecycle.',
    },
    {
      icon: TrendingUp,
      title: 'AI-Powered Simulation',
      desc: "Model campaign ROI with Visa's proprietary financial engine before committing budget.",
    },
    {
      icon: BarChart2,
      title: 'Real-Time Analytics',
      desc: 'Sensitivity analysis, budget optimization, and break-even projections in seconds.',
    },
    {
      icon: Shield,
      title: 'Issuer-Grade Security',
      desc: 'Enterprise security with RLS-enforced data isolation per issuer partner.',
    },
  ];

  return (
    <>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-18px) translateX(6px); }
          66% { transform: translateY(-8px) translateX(-4px); }
        }
        @keyframes float-med {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          40% { transform: translateY(-12px) translateX(-8px); }
          70% { transform: translateY(-22px) translateX(4px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-14px) translateX(5px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -20px) scale(1.04); }
          66% { transform: translate(-8px, -10px) scale(0.97); }
        }
        @keyframes shimmer-line {
          0% { opacity: 0; transform: scaleX(0); transform-origin: left; }
          40% { opacity: 1; transform: scaleX(1); transform-origin: left; }
          60% { opacity: 1; transform: scaleX(1); transform-origin: right; }
          100% { opacity: 0; transform: scaleX(0); transform-origin: right; }
        }
        @keyframes float-right-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-15px) translateX(-5px); }
          66% { transform: translateY(-6px) translateX(3px); }
        }
        @keyframes float-right-med {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          40% { transform: translateY(-10px) translateX(6px); }
          70% { transform: translateY(-20px) translateX(-3px); }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.06); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow  { animation: float-slow  9s ease-in-out infinite; }
        .animate-float-med   { animation: float-med   7s ease-in-out infinite; }
        .animate-float-fast  { animation: float-fast  5.5s ease-in-out infinite; }
        .animate-pulse-glow  { animation: pulse-glow  4s ease-in-out infinite; }
        .animate-drift       { animation: drift       12s ease-in-out infinite; }
        .animate-shimmer     { animation: shimmer-line 3.5s ease-in-out infinite; }
        .animate-float-rs    { animation: float-right-slow 9s ease-in-out infinite; }
        .animate-float-rm    { animation: float-right-med  7s ease-in-out infinite; }
        .animate-pulse-ring  { animation: pulse-ring  5s ease-in-out infinite; }
        .animate-slide-up    { animation: slide-up 0.35s ease-out both; }
      `}</style>

      <div className="min-h-screen flex" style={{ background: '#07143a' }}>
        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden" style={{ background: '#07143a' }}>

          <div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none animate-drift"
            style={{ background: 'radial-gradient(circle, rgba(20,52,203,0.4) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none animate-pulse-glow"
            style={{ background: 'radial-gradient(circle, rgba(247,182,0,0.14) 0%, transparent 70%)' }}
          />

          <div className="absolute top-[12%] right-[18%] pointer-events-none animate-float-slow" style={{ animationDelay: '0s' }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(168,184,255,0.7)' }} />
          </div>
          <div className="absolute top-[28%] right-[8%] pointer-events-none animate-float-med" style={{ animationDelay: '1.2s' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(247,182,0,0.6)' }} />
          </div>
          <div className="absolute top-[55%] right-[22%] pointer-events-none animate-float-fast" style={{ animationDelay: '0.6s' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(168,184,255,0.55)' }} />
          </div>
          <div className="absolute top-[40%] left-[8%] pointer-events-none animate-float-slow" style={{ animationDelay: '2s' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(168,184,255,0.5)' }} />
          </div>
          <div className="absolute bottom-[22%] left-[14%] pointer-events-none animate-float-med" style={{ animationDelay: '0.9s' }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(247,182,0,0.45)' }} />
          </div>
          <div className="absolute bottom-[18%] right-[12%] pointer-events-none animate-float-fast" style={{ animationDelay: '1.8s' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(168,184,255,0.5)' }} />
          </div>
          <div className="absolute top-[70%] left-[30%] pointer-events-none animate-float-slow" style={{ animationDelay: '3s' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(247,182,0,0.4)' }} />
          </div>

          <div
            className="absolute top-[20%] right-[10%] w-20 h-20 rounded-full pointer-events-none animate-float-slow"
            style={{ border: '1.5px solid rgba(20,52,203,0.5)', animationDelay: '0.4s' }}
          />
          <div
            className="absolute bottom-[28%] left-[6%] w-12 h-12 rounded-full pointer-events-none animate-float-med"
            style={{ border: '1.5px solid rgba(247,182,0,0.35)', animationDelay: '1.5s' }}
          />
          <div
            className="absolute top-[48%] right-[5%] w-8 h-8 rounded-full pointer-events-none animate-float-fast"
            style={{ border: '1px solid rgba(168,184,255,0.4)', animationDelay: '0.2s' }}
          />
          <div
            className="absolute top-[65%] left-[22%] w-6 h-6 rounded-full pointer-events-none animate-pulse-ring"
            style={{ border: '1px solid rgba(168,184,255,0.35)', animationDelay: '1s' }}
          />

          <div
            className="absolute pointer-events-none animate-shimmer"
            style={{ top: '21%', right: '14%', width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(168,184,255,0.65), transparent)', animationDelay: '0s', animationDuration: '4s' }}
          />
          <div
            className="absolute pointer-events-none animate-shimmer"
            style={{ bottom: '26%', left: '10%', width: '50px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(247,182,0,0.55), transparent)', animationDelay: '2s', animationDuration: '4s' }}
          />
          <div
            className="absolute pointer-events-none animate-shimmer"
            style={{ top: '55%', right: '18%', width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(168,184,255,0.5), transparent)', animationDelay: '1s', animationDuration: '4.5s' }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <p className="text-xs font-medium tracking-widest uppercase mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Issuer Partner Platform
            </p>
          </div>

          {/* Hero text */}
          <div className="relative z-10 space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                Campaign<br />Decisioning<br />
                <span style={{ color: '#f7b600' }}>Studio</span>
              </h1>
              <p className="text-base leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Design, simulate, and launch data-driven cardholder campaigns using Visa&apos;s intelligence infrastructure.
              </p>
            </div>
            <div className="space-y-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(20,52,203,0.4)', border: '1px solid rgba(20,52,203,0.6)' }}
                    >
                      <Icon size={14} style={{ color: '#a8b8ff' }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{f.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} Visa Inc. All rights reserved. Confidential.
          </p>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden" style={{ background: '#f8f9fc' }}>

          <div
            className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none animate-pulse-glow"
            style={{ background: 'radial-gradient(circle, rgba(20,52,203,0.07) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full pointer-events-none animate-drift"
            style={{ background: 'radial-gradient(circle, rgba(20,52,203,0.05) 0%, transparent 70%)', animationDelay: '3s' }}
          />

          <div className="absolute top-[10%] right-[8%] pointer-events-none animate-float-rs" style={{ animationDelay: '0.5s' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(20,52,203,0.18)' }} />
          </div>
          <div className="absolute top-[22%] right-[20%] pointer-events-none animate-float-rm" style={{ animationDelay: '1.4s' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(20,52,203,0.14)' }} />
          </div>
          <div className="absolute top-[75%] right-[6%] pointer-events-none animate-float-rs" style={{ animationDelay: '2.2s' }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(20,52,203,0.13)' }} />
          </div>
          <div className="absolute bottom-[15%] right-[22%] pointer-events-none animate-float-rm" style={{ animationDelay: '0.8s' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(247,182,0,0.35)' }} />
          </div>

          <div
            className="absolute top-[15%] right-[12%] w-16 h-16 rounded-full pointer-events-none animate-float-rs"
            style={{ border: '1px solid rgba(20,52,203,0.12)', animationDelay: '0.6s' }}
          />
          <div
            className="absolute bottom-[20%] right-[15%] w-10 h-10 rounded-full pointer-events-none animate-float-rm"
            style={{ border: '1px solid rgba(20,52,203,0.1)', animationDelay: '2s' }}
          />
          <div
            className="absolute pointer-events-none animate-shimmer"
            style={{ top: '18%', right: '10%', width: '50px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(20,52,203,0.2), transparent)', animationDelay: '1.5s', animationDuration: '4.5s' }}
          />

          {/* Form container */}
          <div className="w-full max-w-sm relative z-10">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-10">
              <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" className="h-6 w-auto" />
              <div className="w-px h-5 bg-slate-300" />
              <p className="text-sm font-semibold" style={{ color: '#07143a' }}>Campaign Decisioning Studio</p>
            </div>

            {/* ── STEP 1: Credentials ── */}
            {step === 'credentials' && (
              <div className="animate-slide-up">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1" style={{ color: '#07143a' }}>Sign in</h2>
                  <p className="text-sm" style={{ color: '#4a5578' }}>Access your issuer workspace</p>
                </div>

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold" style={{ color: '#07143a' }}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourbank.com"
                      required
                      className="w-full rounded-lg text-sm px-3 py-2.5 transition-all outline-none"
                      style={{ background: '#fff', border: '1.5px solid #dde3f5', color: '#07143a' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold" style={{ color: '#07143a' }}>Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full rounded-lg text-sm px-3 py-2.5 pr-10 transition-all outline-none"
                        style={{ background: '#fff', border: '1.5px solid #dde3f5', color: '#07143a' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#8894b4' }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <AlertCircle size={14} className="flex-shrink-0" style={{ color: '#dc2626' }} />
                      <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold py-2.5 px-5 rounded-full transition-all text-sm flex items-center justify-center gap-2 text-white disabled:opacity-60"
                    style={{ background: '#1434cb', border: '1.5px solid #1434cb' }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = '#0e2490')}
                    onMouseLeave={e => !loading && (e.currentTarget.style.background = '#1434cb')}
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    ) : null}
                    {loading ? 'Signing in...' : 'Continue'}
                    {!loading && <ChevronRight size={14} style={{ color: '#f7b600' }} />}
                  </button>
                </form>

                {/* Credentials hint */}
                <div className="mt-6 p-4 rounded-xl" style={{ background: '#f0f3fb', border: '1px solid #dde3f5' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#07143a' }}>Demo credentials</p>
                  <p className="text-xs" style={{ color: '#4a5578' }}>
                    Email: <span className="font-medium" style={{ color: '#1434cb' }}>hardi@nusantarabank.co.id</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a5578' }}>
                    Password: <span className="font-medium" style={{ color: '#1434cb' }}>visanusantara</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Portfolio selection ── */}
            {step === 'portfolio' && issuer && (
              <div className="animate-slide-up">
                <button
                  onClick={() => setStep('credentials')}
                  className="flex items-center gap-1.5 text-xs mb-8 transition-opacity hover:opacity-70"
                  style={{ color: '#8894b4' }}
                >
                  <ArrowLeft size={13} /> Back
                </button>

                {/* Bank identity */}
                <div className="flex items-center gap-3 mb-8 p-4 rounded-xl" style={{ background: '#fff', border: '1.5px solid #dde3f5' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
                    <span className="text-lg font-black" style={{ color: '#1434cb' }}>
                      {issuer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#07143a' }}>{issuer.name}</p>
                    <p className="text-xs" style={{ color: '#8894b4' }}>{issuer.email}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#07143a' }}>Select portfolio</h2>
                  <p className="text-sm" style={{ color: '#4a5578' }}>Choose the card portfolio you want to work with for this session.</p>
                </div>

                <div className="space-y-3 mb-6">
                  {/* Credit — active */}
                  {(() => {
                    const isSelected = selectedPortfolio === 'Credit';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedPortfolio('Credit')}
                        className="w-full text-left rounded-xl p-4 transition-all"
                        style={{
                          background: isSelected ? '#eff6ff' : '#fff',
                          border: isSelected ? '2px solid #1434cb' : '1.5px solid #dde3f5',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: isSelected ? 'rgba(20,52,203,0.1)' : '#f0f3fb' }}
                          >
                            <CreditCard size={16} style={{ color: isSelected ? '#1434cb' : '#8894b4' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold" style={{ color: isSelected ? '#1434cb' : '#07143a' }}>Credit</p>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#1434cb' }}>
                                  <Check size={11} color="#fff" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#4a5578' }}>
                              Manage credit card cardholder campaigns and spend stimulation programs.
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Debit — disabled */}
                  <div
                    className="w-full text-left rounded-xl p-4 cursor-not-allowed"
                    style={{ background: '#f7f8fa', border: '1.5px solid #e8eaf0', opacity: 0.7 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: '#eef0f5' }}
                      >
                        <Wallet size={16} style={{ color: '#b0b8cc' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: '#b0b8cc' }}>Debit</p>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: '#e8eaf0', color: '#8894b4' }}
                          >
                            Not available
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#b0b8cc' }}>
                          You don&apos;t have a debit portfolio with Visa.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedPortfolio || confirming}
                  onClick={handlePortfolioConfirm}
                  className="w-full font-semibold py-2.5 px-5 rounded-full transition-all text-sm flex items-center justify-center gap-2 text-white disabled:opacity-40"
                  style={{ background: '#1434cb', border: '1.5px solid #1434cb' }}
                  onMouseEnter={e => selectedPortfolio && !confirming && (e.currentTarget.style.background = '#0e2490')}
                  onMouseLeave={e => selectedPortfolio && !confirming && (e.currentTarget.style.background = '#1434cb')}
                >
                  {confirming ? (
                    <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  ) : null}
                  {confirming ? 'Entering workspace...' : `Enter as ${selectedPortfolio ?? '…'}`}
                  {!confirming && <ChevronRight size={14} style={{ color: '#f7b600' }} />}
                </button>
              </div>
            )}

            <p className="mt-8 text-center text-xs" style={{ color: '#8894b4' }}>
              &copy; {new Date().getFullYear()} Visa Inc. Confidential &amp; Proprietary.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
