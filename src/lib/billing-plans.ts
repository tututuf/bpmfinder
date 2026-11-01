export const BILLING_PLANS = {
  monthly: { id: 'monthly', name: 'Monthly', amount: '7.99', monthlyAmount: '7.99', period: 'monthly', description: '$7.99 billed every month' },
  yearly: { id: 'yearly', name: 'Yearly', amount: '35.88', monthlyAmount: '2.99', period: 'yearly', description: '$35.88 billed every year' },
} as const;
export type BillingPlan = keyof typeof BILLING_PLANS;
export function isBillingPlan(value: unknown): value is BillingPlan { return value === 'monthly' || value === 'yearly'; }
export type BillingStatus = { hasPro: boolean; plan: BillingPlan | null; state: string; expiresAt: number | null; checkoutAvailable: boolean; testMode?: boolean; developmentSavingUnlocked?: boolean };
export const FREE_BILLING_STATUS: BillingStatus = { hasPro: false, plan: null, state: 'free', expiresAt: null, checkoutAvailable: false };
// Development saving can be tested without a subscription; analysis insights always require Pro.
export function developmentSavingAccess(runtime: string | undefined) { return runtime === 'development'; }
