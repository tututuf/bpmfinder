import 'server-only';
import { Resend } from 'resend';
import { registrationEmail } from './registration-email';

export function mailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM); }

export async function sendRegistrationCode(email: string, code: string, requestId: string) {
  if (!mailConfigured()) throw new Error('Mail is not configured.');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM!, to: [email], ...registrationEmail(code),
  }, { idempotencyKey: `registration/${requestId}`, signal: AbortSignal.timeout(15000) });
  if (result.error || !result.data?.id) {
    // Keep addresses, codes, API responses and credentials out of application logs.
    console.error('[mail] Registration email was rejected.');
    throw new Error('Mail delivery failed.');
  }
}
