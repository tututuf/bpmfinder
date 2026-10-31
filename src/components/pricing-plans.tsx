'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { BILLING_PLANS, type BillingPlan } from '@/lib/billing-plans';
import { useBilling } from './billing-provider';

export default function PricingPlans() {
  const { status } = useSession();
  const { hasPro, plan, state, expiresAt, checkoutAvailable, loading, refresh, developmentSavingUnlocked } = useBilling();
  const [busy, setBusy] = useState<BillingPlan | 'cancel' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const hasSubscription = !!plan && ['active', 'canceling', 'past_due'].includes(state);
  async function checkout(selected: BillingPlan) {
    setBusy(selected); setError('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn’t open checkout. Please try again.');
      const url = new URL(data.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'pancake.waffo.ai') throw new Error('Checkout is unavailable. Please try again.');
      window.location.assign(url.href);
    } catch (error) { setError(error instanceof Error ? error.message : 'Connection failed. Please try again.'); setBusy(null); }
  }
  async function cancel() {
    setBusy('cancel'); setError(''); setMessage('');
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn’t cancel renewal. Please try again.');
      setMessage(data.message); setConfirmCancel(false); await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Connection failed. Please try again.'); }
    finally { setBusy(null); }
  }
  const date = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  return <>
    {developmentSavingUnlocked && <div className="subscription-summary" role="status"><div><span className="pro-label">DEVELOPMENT ACCESS</span><h2>Save Results is unlocked for testing.</h2><p>Sign in to test Save Results in development. Energy, Dance and Happy require an active Pro subscription. CSV export is free on every plan.</p></div><Link className="outline-button" href="/#workspace">Open the tools <ArrowRight size={15} /></Link></div>}
    {hasSubscription && <div className="subscription-summary" role="status"><div><span className="pro-label">YOUR SUBSCRIPTION</span><h2>Pro · {plan === 'yearly' ? 'Yearly' : 'Monthly'}</h2><p>{state === 'past_due' ? 'Your renewal payment is overdue. Pro access is paused.' : state === 'canceling' ? (hasPro ? `Renewal canceled. Pro ends on ${date}.` : 'Renewal canceled. Your paid period has ended.') : hasPro ? `Your current paid period ends on ${date}.` : 'Your current paid period has ended. Waiting for renewal confirmation.'}</p></div>{state !== 'canceling' && <button className="text-button" onClick={() => setConfirmCancel(true)} disabled={!!busy}>Cancel renewal</button>}</div>}
    {confirmCancel && <div className="cancel-confirm"><p>Cancel automatic renewal?{hasPro ? ` Your Pro access stays active until ${date}.` : ' No further renewals will be scheduled.'}</p><div><button className="outline-button" disabled={!!busy} onClick={() => setConfirmCancel(false)}>Keep subscription</button><button className="primary-button" disabled={!!busy} onClick={cancel}>{busy === 'cancel' ? 'Canceling…' : 'Cancel renewal'}</button></div></div>}
    <section className="pricing-cards" aria-label="Choose your plan">
      <article className="price-card free-price-card"><div className="price-card-label"><span>THE ESSENTIALS</span><span>FREE</span></div><h2>Find your rhythm.</h2><p className="price-card-description">The beat, the key, a place to start.</p><div className="plan-price"><strong>$0</strong><span>forever</span></div><p className="plan-billing">No account. No credit card.</p><Link className="outline-button plan-select" href="/#workspace">Use the free tools <ArrowRight size={16} /></Link><ul>{['BPM, musical key & Camelot', 'Full-track local analysis', 'Tap Tempo & metronome', 'Track playback & result editing', 'Free CSV export'].map(text => <li key={text}><Check size={14} />{text}</li>)}</ul></article>
      {(Object.keys(BILLING_PLANS) as BillingPlan[]).map(id => { const item = BILLING_PLANS[id]; return <article key={id} className={`price-card pro-price-card ${id === 'yearly' ? 'yearly-price-card' : ''}`}>
        <div className="price-card-label"><span>THE PRO EDITION</span><span>{id === 'yearly' ? 'BEST VALUE' : 'PRO'}</span></div><h2>{item.name}</h2><p className="price-card-description">A closer listen. A fuller picture.</p><div className="plan-price"><span className="price-currency">$</span><strong>{item.monthlyAmount}</strong><span>/ month</span></div><p className="plan-billing">{id === 'yearly' ? <>Billed yearly at <strong>$35.88</strong></> : <>Billed monthly. Cancel renewal anytime.</>}</p>
        {status === 'unauthenticated' ? <Link className={`plan-select ${id === 'yearly' ? 'primary-button' : 'outline-button'}`} href="/login?callbackUrl=%2Fpricing">Sign in to upgrade <ArrowRight size={16} /></Link> : <button className={`plan-select ${id === 'yearly' ? 'primary-button' : 'outline-button'}`} disabled={loading || !!busy || hasSubscription || !checkoutAvailable} onClick={() => checkout(id)}>{busy === id ? <><LoaderCircle size={16} className="spin" />Opening checkout…</> : hasPro ? 'Pro is active' : hasSubscription ? 'Manage subscription above' : loading ? 'Checking availability…' : !checkoutAvailable ? 'Payments coming soon' : <>Choose {item.name.toLowerCase()} <ArrowRight size={16} /></>}</button>}
        <ul><li><Check size={14} />Everything in Free</li><li><Check size={14} />Energy score</li><li><Check size={14} />Danceability & happiness scores</li><li><Check size={14} />Save Results to your account</li></ul>
      </article>; })}
    </section>
    {!loading && !checkoutAvailable && !hasSubscription && <p className="billing-availability">Pro plans are coming soon. The free BPM & key tools are available now.</p>}
    <p className="pricing-tax-note">Prices in USD. Any applicable taxes are shown at checkout. Monthly and yearly plans renew automatically until canceled. Read our <Link href="/terms#billing">subscription terms</Link>, <Link href="/terms#cancellation">cancellation policy</Link> and <Link href="/terms#refunds">7-day refund policy</Link> before subscribing. See our <Link href="/privacy">Privacy Policy</Link> for account and payment data.</p>
    {error && <p className="billing-message billing-error" role="alert">{error}</p>}
    {message && <p className="billing-message" role="status">{message}</p>}
  </>;
}
