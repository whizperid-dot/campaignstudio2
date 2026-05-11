'use client';
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, error, hint, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#07143a' }}>
          {label}
          {props.required && <span className="ml-1" style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}
      <select
        className={`w-full rounded-lg text-sm transition-all outline-none px-3 py-2.5 ${className}`}
        style={{
          background: '#fff',
          border: `1.5px solid ${error ? '#dc2626' : '#dde3f5'}`,
          color: '#07143a',
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: '#8894b4' }}>{hint}</p>}
    </div>
  );
}
