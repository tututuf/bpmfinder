'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';

export default function EmailAuth({ callbackUrl, configured, registrationConfigured }: { callbackUrl: string; configured: boolean; registrationConfigured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<'code' | 'submit' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  async function sendCode() {
    setBusy('code'); setError(''); setMessage('');
    try {
      const response = await fetch('/api/account/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (data.retryAfter) { setDeadline(Date.now() + data.retryAfter * 1000); setRemaining(data.retryAfter); }
      if (!response.ok) throw new Error(data.error || 'Couldn’t send a code. Please try again.');
      setMessage(data.message); setCode('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Connection failed. Please try again.'); }
    finally { setBusy(null); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('submit'); setError(''); setMessage('');
    let registered = false;
    try {
      if (mode === 'register') {
        const response = await fetch('/api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, password }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Couldn’t create your account. Please try again.');
        registered = true;
      }
      const result = await signIn('credentials', { email, password, callbackUrl, redirect: false });
      if (!result || result.error) {
        if (registered) { setMode('login'); setCode(''); setPassword(''); setMessage('Account created. Please sign in with your new password.'); return; }
        throw new Error('Email or password is incorrect, or there have been too many attempts. Check your details or try again in 15 minutes.');
      }
      setPassword(''); setCode('');
      router.replace(callbackUrl); router.refresh();
    } catch (error) {
      if (registered) { setMode('login'); setPassword(''); setCode(''); setMessage('Account created. Please sign in with your new password.'); }
      else setError(error instanceof Error ? error.message : 'Connection failed. Please try again.');
    } finally { setBusy(null); }
  }

  const available = configured && (mode === 'login' || registrationConfigured);
  return <div className="email-auth">
    <div className="auth-mode" aria-label="Choose sign in or registration">
      <button type="button" aria-pressed={mode === 'login'} disabled={!!busy} onClick={() => { setMode('login'); setPassword(''); setCode(''); setVisible(false); setError(''); setMessage(''); }}>Sign in</button>
      <button type="button" aria-pressed={mode === 'register'} disabled={!!busy} onClick={() => { setMode('register'); setPassword(''); setVisible(false); setError(''); setMessage(''); }}>Create account</button>
    </div>
    <form onSubmit={submit} className="email-form">
      <label htmlFor="account-email">Email address</label>
      <div className="email-input"><Mail size={16} aria-hidden="true" /><input id="account-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} disabled={!!busy} onChange={event => { setEmail(event.target.value); setCode(''); setError(''); setMessage(''); }} /></div>
      {mode === 'register' && <>
        <label htmlFor="account-code">Verification code</label>
        <div className="code-input"><input id="account-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="6-digit code" maxLength={6} required value={code} disabled={!!busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /><button type="button" disabled={!!busy || remaining > 0 || !email.trim() || !available} onClick={sendCode}>{busy === 'code' ? <LoaderCircle size={16} className="spin" aria-label="Sending code" /> : remaining ? `Resend in ${remaining}s` : 'Send code'}</button></div>
        <p className="field-hint">Check your inbox and spam folder. The code expires in 10 minutes.</p>
      </>}
      <label htmlFor="account-password">{mode === 'register' ? 'Create a password' : 'Password'}</label>
      <div className="password-input"><input id="account-password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Choose a password' : 'Enter your password'} required value={password} disabled={!!busy} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      {!available && <p className="auth-feedback auth-feedback-error" role="alert">{mode === 'register' ? 'Email registration is temporarily unavailable. Please try again later.' : 'Email sign-in is temporarily unavailable.'}</p>}
      {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
      {message && <p className="auth-feedback auth-feedback-success" role="status">{message}</p>}
      <button className="email-submit" type="submit" disabled={!!busy || !available}>{busy === 'submit' ? <><LoaderCircle size={17} className="spin" /> {mode === 'register' ? 'Creating account…' : 'Signing in…'}</> : <>{mode === 'register' ? 'Create account' : 'Sign in with email'}<ArrowRight size={17} /></>}</button>
    </form>
  </div>;
}
