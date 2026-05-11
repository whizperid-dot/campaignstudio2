'use client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export type Step1Data = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
};

interface Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
}

function durationDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return null;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function Step1Details({ data, onChange, onNext }: Props) {
  const days = durationDays(data.start_date, data.end_date);
  const dateError = data.start_date && data.end_date && days === null
    ? 'End date must be after start date'
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.name.trim() && data.start_date && data.end_date && !dateError) onNext();
  }

  const canProceed = !!data.name.trim() && !!data.start_date && !!data.end_date && !dateError;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8894b4', letterSpacing: '0.12em' }}>Step 1</p>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#07143a' }}>Campaign Details</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#4a5578', maxWidth: 420 }}>
          Name your campaign and set the plan dates. Duration is calculated automatically.
        </p>
      </div>

      <div className="space-y-5">
        <Input
          label="Campaign Name"
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Q3 XB Reactivation — Lapsed Travellers"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#07143a' }}>
            Description <span className="font-normal" style={{ color: '#8894b4' }}>(optional)</span>
          </label>
          <textarea
            value={data.description}
            onChange={e => onChange({ ...data, description: e.target.value })}
            placeholder="Briefly describe the campaign objective and target outcome..."
            rows={3}
            className="w-full rounded-xl text-sm px-4 py-3 transition-all outline-none resize-none"
            style={{ background: '#fff', border: '1px solid #dde3f5', color: '#07143a', lineHeight: '1.6' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
            onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
          />
        </div>

        <div className="rounded-2xl p-4 space-y-4" style={{ background: '#fafbfe', border: '1px solid rgba(221,227,245,0.9)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8894b4', letterSpacing: '0.1em' }}>Campaign Plan Dates</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#07143a' }}>Start Date</label>
              <input
                type="date"
                value={data.start_date}
                onChange={e => onChange({ ...data, start_date: e.target.value })}
                required
                className="w-full rounded-xl text-sm px-4 py-2.5 outline-none transition-all"
                style={{ background: '#fff', border: '1px solid #dde3f5', color: '#07143a' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
                onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#07143a' }}>End Date</label>
              <input
                type="date"
                value={data.end_date}
                min={data.start_date || undefined}
                onChange={e => onChange({ ...data, end_date: e.target.value })}
                required
                className="w-full rounded-xl text-sm px-4 py-2.5 outline-none transition-all"
                style={{ background: '#fff', border: '1px solid #dde3f5', color: '#07143a' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
                onBlur={e => (e.currentTarget.style.borderColor = '#dde3f5')}
              />
            </div>
          </div>

          {dateError && (
            <p className="text-xs" style={{ color: '#dc2626' }}>{dateError}</p>
          )}

          {days !== null && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(20,52,203,0.04)', border: '1px solid rgba(20,52,203,0.1)' }}>
              <div className="flex-1">
                <p className="text-xs" style={{ color: '#6b7eb8' }}>Campaign Duration</p>
                <p className="text-lg font-bold" style={{ color: '#07143a' }}>{days} days</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6b7eb8' }}>~{(days / 7).toFixed(1)} weeks</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(221,227,245,0.6)' }} />

      <div className="flex justify-end">
        <Button type="submit" icon={<ArrowRight size={15} />} disabled={!canProceed}>
          Continue to Data Input
        </Button>
      </div>
    </form>
  );
}

export function campaignDurationDays(step1: Step1Data): number {
  const d = durationDays(step1.start_date, step1.end_date);
  return d ?? 30;
}
