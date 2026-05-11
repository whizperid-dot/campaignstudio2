import { supabase, Issuer } from './supabase';

const SESSION_KEY = 'vds_issuer_session';

export function getSession(): Issuer | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(issuer: Issuer) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(issuer));
}

export function setPortfolio(portfolio: 'Credit' | 'Debit') {
  const issuer = getSession();
  if (issuer) setSession({ ...issuer, portfolio });
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function login(
  email: string,
  password: string
): Promise<{ issuer: Issuer | null; error: string | null }> {
  const { data, error } = await supabase
    .from('issuers')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('password_hash', password)
    .maybeSingle();

  if (error) return { issuer: null, error: 'Authentication failed.' };
  if (!data) return { issuer: null, error: 'Invalid email or password.' };

  const issuer = data as Issuer;
  setSession(issuer);
  return { issuer, error: null };
}

export function logout() {
  clearSession();
}
