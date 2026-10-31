import { accounts, accountAuthConfigured, rateLimit, requestSource } from '@/lib/accounts';
import { normalizeEmail, validPassword, hashPassword, digestCode } from '@/lib/account-security';
import { accountResponse, readAccountRequest, accountFailure } from '@/lib/account-http';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await readAccountRequest(request);
    const email = normalizeEmail(body.email);
    if (!email || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) return accountResponse({ error: 'Enter your email and the 6-digit verification code.' }, 400);
    if (!validPassword(body.password)) return accountResponse({ error: 'Enter a password.' }, 400);
    if (!accountAuthConfigured()) return accountResponse({ error: 'Registration is temporarily unavailable.' }, 503);
    const source = requestSource(Object.fromEntries(request.headers));
    for (const limit of [await rateLimit('register-source', source, 30, 900000), await rateLimit('register-email', email, 10, 900000)]) {
      if (!limit.allowed) return accountResponse({ error: 'Too many attempts. Please try again later.' }, 429, limit.retryAfter);
    }
    const passwordHash = await hashPassword(body.password);
    const success = await accounts().register(email, digestCode(process.env.NEXTAUTH_SECRET!, email, body.code), passwordHash);
    if (!success) return accountResponse({ error: 'The code is invalid or expired, or this email is already registered. Request a new code or sign in.' }, 400);
    return accountResponse({ message: 'Account created. You can now sign in.' }, 201);
  } catch (error) { return accountFailure(error); }
}
