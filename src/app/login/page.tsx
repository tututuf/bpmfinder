import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, Check } from 'lucide-react';
import Brand from '@/components/brand';
import GoogleSignIn from '@/components/google-signin';
import EmailAuth from '@/components/email-auth';
import { accountAuthConfigured } from '@/lib/accounts';
import { mailConfigured } from '@/lib/mail';
import { authConfigured, authOptions, authOrigin } from '@/lib/auth';
import { authErrorMessage, safeReturnPath } from '@/lib/auth-navigation';

export const metadata: Metadata = { title: 'Sign in — BPM Finder', robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const origin = authOrigin();
  const callbackUrl = safeReturnPath(params.callbackUrl, origin);
  const errorCode = typeof params.error === 'string' ? params.error : undefined;
  const host = (await headers()).get('host');
  if (host !== new URL(origin).host) {
    const target = new URL('/login', origin);
    target.searchParams.set('callbackUrl', callbackUrl);
    if (errorCode) target.searchParams.set('error', ['AccessDenied', 'Configuration'].includes(errorCode) ? errorCode : 'OAuthSignin');
    redirect(target.href);
  }
  const configured = authConfigured();
  const emailConfigured = accountAuthConfigured();
  const session = emailConfigured ? await getServerSession(authOptions) : null;
  if (session) redirect(callbackUrl);
  const error = authErrorMessage(emailConfigured ? errorCode : 'Configuration');
  return <>
    <main className="login-main page-width">
      <div className="login-copy"><span className="eyebrow">BACK TO YOUR RHYTHM</span><h1>Good music.<br /><em>Good to see you.</em></h1><p>Sign in with email or Google.<br />Your next great mix starts here.</p><div className="login-reassurance"><span><Check size={14} /> Free to use</span><span><Check size={14} /> Audio stays on your device</span></div></div>
      <section className="login-card" aria-labelledby="signin-heading"><span className="brand login-brand" aria-hidden="true"><Brand /></span><h2 id="signin-heading">Welcome to BPM Finder.</h2><p>One account. Back to the music.</p>{error && <p className="login-error" role="alert">{error}</p>}<EmailAuth callbackUrl={callbackUrl} configured={emailConfigured} registrationConfigured={mailConfigured()} /><div className="auth-divider"><span>or</span></div><GoogleSignIn callbackUrl={callbackUrl} configured={configured} /><p className="login-terms">By creating an account or continuing, you agree to our <Link href="/terms">Terms of Service</Link>. Read our <Link href="/privacy">Privacy Policy</Link> to learn how we handle your information.</p><p className="login-privacy">Email registration stores your verified email and a salted password hash. Google sign-in shares your name, email and profile picture. Audio stays on your device. With Pro, you can select the Save Results checkbox to automatically add new analysis results to your account history.</p><Link className="login-guest" href={callbackUrl}><ArrowLeft size={14} /> Continue without signing in</Link></section>
    </main>
  </>;
}
