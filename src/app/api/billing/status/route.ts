import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { billing, checkoutAvailable, drainBillingInbox, waffoEnvironment } from '@/lib/billing';
import { accountResponse } from '@/lib/account-http';
import { developmentSavingAccess } from '@/lib/billing-plans';

export const runtime = 'nodejs';
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    await drainBillingInbox();
    return accountResponse({ ...await billing().entitlement(session?.billingIdentity), checkoutAvailable: checkoutAvailable(), testMode: waffoEnvironment() === 'test', developmentSavingUnlocked: developmentSavingAccess(process.env.NODE_ENV) });
  } catch {
    return accountResponse({ hasPro: false, plan: null, state: 'unavailable', expiresAt: null, checkoutAvailable: false }, 503);
  }
}
