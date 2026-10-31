'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { FREE_BILLING_STATUS, type BillingStatus } from '@/lib/billing-plans';

const BillingContext = createContext({ ...FREE_BILLING_STATUS, loading: true, refresh: async (): Promise<BillingStatus> => FREE_BILLING_STATUS });
export function BillingProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const identity = status === 'authenticated' ? session?.billingIdentity || '' : '';
  const identityRef = useRef(identity); identityRef.current = identity;
  const requestNumber = useRef(0);
  const [state, setState] = useState<{ identity: string; value: BillingStatus; loading: boolean }>({ identity: '', value: FREE_BILLING_STATUS, loading: true });
  const refresh = useCallback(async () => {
    const request = ++requestNumber.current;
    const requestedIdentity = identity;
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json() as BillingStatus;
      if (request !== requestNumber.current || requestedIdentity !== identityRef.current) return FREE_BILLING_STATUS;
      const value = { ...data, hasPro: !!requestedIdentity && data.hasPro === true && !!data.expiresAt && data.expiresAt > Date.now() };
      setState({ identity: requestedIdentity, value, loading: false }); return value;
    } catch {
      if (request === requestNumber.current && requestedIdentity === identityRef.current) setState({ identity: requestedIdentity, value: FREE_BILLING_STATUS, loading: false });
      return FREE_BILLING_STATUS;
    }
  }, [identity]);
  useEffect(() => {
    if (status === 'loading') return;
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    const timer = setInterval(focus, 30000);
    return () => { requestNumber.current++; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh, status]);
  const value = state.identity === identity ? state.value : FREE_BILLING_STATUS;
  return <BillingContext.Provider value={{ ...value, hasPro: !!identity && value.hasPro && !!value.expiresAt && value.expiresAt > Date.now(), loading: status === 'loading' || state.identity !== identity || state.loading, refresh }}>{children}</BillingContext.Provider>;
}
export const useBilling = () => useContext(BillingContext);
