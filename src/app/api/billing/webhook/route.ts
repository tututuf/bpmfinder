import { after } from 'next/server';
import { verifyWebhook } from '@waffo/pancake-ts';
import { billing, drainBillingInbox, waffoEnvironment, waffoStore } from '@/lib/billing';
import type { BillingEvent } from '@/lib/billing-store';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!waffoStore()) return new Response('Not configured', { status: 503 });
  const signature = request.headers.get('x-waffo-signature');
  if (!signature) return new Response('Invalid signature', { status: 401 });
  const reader = request.body?.getReader();
  if (!reader) return new Response('Invalid body', { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) { await reader.cancel(); return new Response('Request too large', { status: 413 }); }
    chunks.push(value);
  }
  let event;
  try {
    event = verifyWebhook(Buffer.concat(chunks).toString('utf8'), signature, { environment: waffoEnvironment() });
  } catch { return new Response('Invalid signature', { status: 401 }); }
  if (event.mode !== waffoEnvironment() || event.storeId !== waffoStore()) return new Response('Wrong store or environment', { status: 400 });
  if (typeof event.id !== 'string' || !event.id || event.id.length > 200 || !event.data || !Number.isFinite(Date.parse(event.timestamp))) return new Response('Invalid event', { status: 400 });
  // Persist only fields needed for fulfillment; omit buyer email, addresses and instrument details.
  const input = event.data as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of ['orderId', 'merchantProvidedBuyerIdentity', 'orderMerchantExternalId', 'orderStatus', 'billingPeriod', 'currentPeriodEnd', 'paymentId', 'refundedAmount', 'originalChargedAmount']) {
    if (typeof input[key] === 'string') data[key] = input[key];
  }
  if (input.orderMetadata && typeof input.orderMetadata === 'object') {
    const metadata = input.orderMetadata as Record<string, unknown>;
    data.orderMetadata = { checkoutId: metadata.checkoutId, plan: metadata.plan };
  }
  const minimal = { id: event.id, timestamp: event.timestamp, eventType: event.eventType, storeId: event.storeId, mode: event.mode, data } as BillingEvent;
  try { await billing().enqueue(minimal); }
  catch { return new Response('Please retry', { status: 503 }); }
  // The durable inbox is committed before acknowledgement; after() is a fast path, not the only retry path.
  after(async () => { try { await drainBillingInbox(); } catch { console.error('[billing] Pending webhook fulfillment needs retry.'); } });
  return new Response('OK', { headers: { 'Cache-Control': 'no-store' } });
}
