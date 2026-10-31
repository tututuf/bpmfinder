import 'server-only';
import { createHash } from 'node:crypto';
import { WaffoPancake } from '@waffo/pancake-ts';
import { storage } from './storage';
import { type BillingPlan } from './billing-plans';

export const waffoEnvironment = () => process.env.WAFFO_ENVIRONMENT === 'test' ? 'test' : 'prod';
export const waffoStore = () => process.env.WAFFO_STORE_ID || '';
export function productId(plan: BillingPlan) { return (plan === 'monthly' ? process.env.WAFFO_MONTHLY_PRODUCT_ID : process.env.WAFFO_YEARLY_PRODUCT_ID) || ''; }
export function waffoClient() {
  return new WaffoPancake({ merchantId: process.env.WAFFO_MERCHANT_ID || '', privateKey: process.env.WAFFO_PRIVATE_KEY || '', environment: waffoEnvironment() });
}
export function checkoutAvailable() {
  if (process.env.WAFFO_BILLING_ENABLED !== 'true' || !waffoStore() || !productId('monthly') || !productId('yearly')) return false;
  if (waffoEnvironment() === 'prod' && process.env.ANALYSIS_ENGINE === 'legacy' && process.env.COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED !== 'true') return false;
  return paymentCredentialsConfigured();
}
export function paymentCredentialsConfigured() {
  if (!process.env.WAFFO_MERCHANT_ID || !waffoStore() || !process.env.WAFFO_PRIVATE_KEY) return false;
  try { waffoClient(); return true; } catch { return false; }
}
export function billingIdentity(provider: string, subject: string) {
  // Provider-scoped stable identity; matching email addresses never merge subscriptions.
  return `bpm_user_${createHash('sha256').update(JSON.stringify([provider, subject])).digest('hex')}`;
}
export const billing = () => storage('billing');
export function drainBillingInbox() { return billing().processInbox(waffoStore(), waffoEnvironment()); }
