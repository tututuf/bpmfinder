import 'server-only';
import { storage } from './storage';
import { privateRateKey } from './account-security';
export const accounts = () => storage('accounts');
export function accountAuthConfigured() { return Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL); }
export function rateLimit(scope: string, value: string, maximum: number, windowMs: number) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Account authentication is not configured.');
  return accounts().limit(privateRateKey(secret, scope + ':' + value), maximum, windowMs);
}
export function requestSource(headers: Record<string, string | string[] | undefined>) {
  const key = process.env.AUTH_TRUSTED_IP_HEADER?.toLowerCase();
  const value = key ? headers[key] : undefined;
  return typeof value === 'string' ? value.slice(0, 128) : 'shared-unconfigured-source';
}
