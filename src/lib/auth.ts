import 'server-only';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { safeReturnPath } from './auth-navigation';
import { accounts, accountAuthConfigured, rateLimit, requestSource } from './accounts';
import { normalizeEmail, validPassword, verifyPassword } from './account-security';
import { billingIdentity } from './billing';

export function authOrigin() {
  const url = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
    throw new Error('NEXTAUTH_URL must be HTTPS, or http://localhost for local development.');
  }
  return url.origin;
}

export function authConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorization: { params: { scope: 'openid email profile', prompt: 'select_account', access_type: 'online' } },
    checks: ['pkce', 'state', 'nonce'],
    httpOptions: { timeout: 10000 },
  }), CredentialsProvider({
    name: 'Email and password',
    credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
    async authorize(credentials, request) {
      const email = normalizeEmail(credentials?.email);
      if (!accountAuthConfigured() || !email || !validPassword(credentials?.password)) return null;
      try {
        const source = requestSource(request.headers || {});
        const sourceLimit = await rateLimit('login-source', source, 80, 900000);
        const emailLimit = await rateLimit('login-email', email, 10, 900000);
        if (!sourceLimit.allowed || !emailLimit.allowed) return null;
        const account = await accounts().account(email);
        const matches = await verifyPassword(credentials.password, account?.password_hash);
        if (!account || !matches) return null;
        return { id: account.id, email: account.email, name: account.name };
      } catch {
        console.error('[auth] Password authentication failed.');
        return null;
      }
    },
  })],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) token.billingIdentity = billingIdentity(account.provider, account.provider === 'credentials' ? user.id : account.providerAccountId);
      return token;
    },
    async session({ session, token }) {
      if (token.billingIdentity) session.billingIdentity = token.billingIdentity;
      return session;
    },
    async signIn({ account, profile }) {
      if (account?.provider === 'credentials') return true;
      return account?.provider === 'google' && !!profile && 'email_verified' in profile && profile.email_verified === true;
    },
    async redirect({ url, baseUrl }) {
      return new URL(safeReturnPath(url, baseUrl), baseUrl).href;
    },
  },
  // Log error codes only; OAuth responses and credentials do not belong in logs.
  logger: {
    error(code) { console.error(`[auth] ${code}`); },
    warn(code) { console.warn(`[auth] ${code}`); },
    debug() {},
  },
};
