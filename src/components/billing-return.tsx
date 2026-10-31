'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { useBilling } from './billing-provider';

export default function BillingReturn() {
  const { status } = useSession();
  const { hasPro, refresh } = useBilling();
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    if (status !== 'authenticated' || hasPro) { setWaiting(false); return; }
    let canceled = false, timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    setWaiting(true);
    const check = async () => {
      const state = await refresh();
      if (canceled) return;
      if (state.hasPro || ++attempt >= 10) { setWaiting(false); return; }
      timer = setTimeout(check, 2000);
    };
    void check();
    return () => { canceled = true; clearTimeout(timer); };
  }, [status, hasPro, refresh]);
  return <section className="billing-return"><span className="pro-label">BPM FINDER / SUBSCRIPTION</span><h1>{hasPro ? <>You’re on Pro. <Check size={25} /></> : status === 'unauthenticated' ? 'Sign in to check your plan.' : waiting ? 'Checking your subscription…' : 'Confirmation is still on its way.'}</h1><p>{hasPro ? 'Energy, Dance & Happy are unlocked. Select your tracks to explore the additional insights.' : 'Access is activated after payment confirmation reaches us. If you completed checkout, it may take a moment. You can safely check again.'}</p><div className="billing-return-actions">{hasPro ? <Link className="primary-button" href="/#workspace">Analyze with Pro <ArrowRight size={15} /></Link> : status === 'unauthenticated' ? <Link className="primary-button" href="/login?callbackUrl=%2Fpricing">Sign in <ArrowRight size={15} /></Link> : <button className="primary-button" disabled={waiting} onClick={async () => { setWaiting(true); await refresh(); setWaiting(false); }}>{waiting && <LoaderCircle size={15} className="spin" />}{waiting ? 'Checking…' : 'Check again'}</button>}<Link className="outline-button" href="/pricing">View plans</Link></div></section>;
}
