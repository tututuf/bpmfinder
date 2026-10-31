import { randomInt } from 'node:crypto';
import { accounts, accountAuthConfigured, rateLimit, requestSource } from '@/lib/accounts';
import { normalizeEmail, digestCode } from '@/lib/account-security';
import { accountResponse, readAccountRequest, accountFailure } from '@/lib/account-http';
import { mailConfigured, sendRegistrationCode } from '@/lib/mail';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await readAccountRequest(request);
    const email = normalizeEmail(body.email);
    if (!email) return accountResponse({ error: 'Enter a valid email address.' }, 400);
    if (!accountAuthConfigured() || !mailConfigured()) return accountResponse({ error: 'Email registration is temporarily unavailable. Please try again later.' }, 503);
    const source = requestSource(Object.fromEntries(request.headers));
    for (const limit of [await rateLimit('code-source', source, 30, 3600000), await rateLimit('code-email', email, 10, 86400000)]) {
      if (!limit.allowed) return accountResponse({ error: 'Too many code requests. Please try again later.', retryAfter: limit.retryAfter }, 429, limit.retryAfter);
    }
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const reservation = await accounts().reserveCode(email, digestCode(process.env.NEXTAUTH_SECRET!, email, code));
    if (!reservation.id) return accountResponse({ error: 'Please wait before requesting another code.', retryAfter: reservation.retryAfter }, 429, reservation.retryAfter);
    // Existing accounts receive the same response; registration never replaces a password.
    if (!(await accounts().account(email))) {
      try {
        await sendRegistrationCode(email, code, reservation.id);
        await accounts().markDelivered(email, reservation.id);
      } catch {
        await accounts().invalidateCode(email, reservation.id);
        return accountResponse({ error: 'We couldn’t send the code. Please wait a minute and try again.' }, 503);
      }
    }
    return accountResponse({ message: 'If this address can be registered, a verification code is on its way. Already have an account? Sign in instead.', retryAfter: 60 });
  } catch (error) { return accountFailure(error); }
}
