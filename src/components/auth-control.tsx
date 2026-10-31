'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

export default function AuthControl() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  if (status !== 'authenticated') return <div className="header-auth"><Link className="auth-signin" href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} aria-busy={status === 'loading'}>Sign in <UserRound size={14} aria-hidden="true" /></Link></div>;
  const name = session.user?.name || session.user?.email?.split('@')[0] || 'Your account';
  return <div className="header-auth" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} className="auth-account" aria-label="Your account" aria-expanded={open} aria-controls={open ? 'account-panel' : undefined} onClick={() => setOpen(!open)}><span className="auth-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><span>{name.split(' ')[0]}</span><ChevronDown size={13} aria-hidden="true" /></button>
    {open && <div id="account-panel" className="account-panel"><strong>{name}</strong><span>{session.user?.email}</span><Link className="account-saved-link" href="/saved-results" onClick={() => setOpen(false)}>Saved Results</Link><button disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { await signOut({ redirect: false }); setOpen(false); }
      catch { setError('Couldn’t sign out. Please try again.'); }
      finally { setBusy(false); }
    }}><LogOut size={14} aria-hidden="true" /> {busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert">{error}</p>}</div>}
  </div>;
}
