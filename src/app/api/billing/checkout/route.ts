import { getServerSession } from 'next-auth';
import { TaxCategory } from '@waffo/pancake-ts';
import { authOptions, authOrigin } from '@/lib/auth';
import { billing, checkoutAvailable, drainBillingInbox, productId, waffoClient, waffoEnvironment, waffoStore } from '@/lib/billing';
import { BILLING_PLANS, isBillingPlan } from '@/lib/billing-plans';
import { accountResponse, readAccountRequest, accountFailure } from '@/lib/account-http';
import { rateLimit } from '@/lib/accounts';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  let checkoutId: string | undefined;
  try {
    const body = await readAccountRequest(request);
    const session = await getServerSession(authOptions);
    if (!session?.billingIdentity || !session.user?.email) return accountResponse({ error: 'Sign in before choosing a plan.' }, 401);
    if (!isBillingPlan(body.plan)) return accountResponse({ error: 'Choose a monthly or yearly plan.' }, 400);
    if (!checkoutAvailable()) return accountResponse({ error: 'Payments are not available yet. Please check back soon.' }, 503);
    const limit = await rateLimit('billing-checkout', session.billingIdentity, 5, 600000);
    if (!limit.allowed) return accountResponse({ error: 'Too many checkout requests. Please try again later.' }, 429, limit.retryAfter);
    await drainBillingInbox();
    try { checkoutId = await billing().reserveCheckout(session.billingIdentity, body.plan, waffoStore(), waffoEnvironment()); }
    catch (error) {
      if (error instanceof Error && error.message === 'already-subscribed') return accountResponse({ error: 'You already have Pro. Manage your subscription below.' }, 409);
      if (error instanceof Error && error.message === 'checkout-pending') return accountResponse({ error: 'A checkout is already open. Complete that checkout, or wait for it to expire before trying again.' }, 409);
      throw error;
    }
    const result = await waffoClient().checkout.authenticated.create({
      productId: productId(body.plan), currency: 'USD', buyerIdentity: session.billingIdentity, buyerEmail: session.user.email,
      priceSnapshot: { amount: BILLING_PLANS[body.plan].amount, taxCategory: TaxCategory.SaaS }, withTrial: false,
      successUrl: `${authOrigin()}/billing/return`, darkMode: true, expiresInSeconds: 600,
      metadata: { checkoutId, plan: body.plan }, orderMerchantExternalId: checkoutId,
    }, { idempotencyKey: checkoutId });
    const url = new URL(result.checkoutUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'pancake.waffo.ai') throw new Error('Invalid checkout origin.');
    const expires = Date.parse(result.expiresAt);
    if (!Number.isFinite(expires)) throw new Error('Invalid checkout expiration.');
    await billing().checkoutReady(checkoutId, result.sessionId, expires);
    return accountResponse({ checkoutUrl: result.checkoutUrl });
  } catch (error) {
    // Uncertain provider outcomes retain the reservation until expiry; a retry must not double-charge.
    return accountFailure(error);
  }
}
