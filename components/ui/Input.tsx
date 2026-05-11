'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export default function Input({ label, error, hint, prefix, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#07143a' }}>
          {label}
          {props.required && <span className="ml-1" style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm select-none" style={{ color: '#8894b4' }}>{prefix}</span>
        )}
        <input
          className={`w-full rounded-lg text-sm transition-all outline-none ${prefix ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-16' : 'pr-3'} py-2.5 ${className}`}
          style={{
            background: '#fff',
            border: `1.5px solid ${error ? '#dc2626' : '#dde3f5'}`,
            color: '#07143a',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#1434cb')}
          onBlur={e => (e.currentTarget.style.borderColor = error ? '#dc2626' : '#dde3f5')}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-sm select-none" style={{ color: '#8894b4' }}>{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: '#8894b4' }}>{hint}</p>}
    </div>
  );
}
