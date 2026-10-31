import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ShieldCheck, FileAudio, Layers } from 'lucide-react';
import PricingPlans from '@/components/pricing-plans';
import { pageMetadata } from '@/lib/site';
import './pricing.css';

export const metadata: Metadata = pageMetadata('/pricing', 'Pricing — BPM Finder Free & Pro Plans', 'Find BPM and musical key for free. Pro adds Save Results, Energy, Dance and Happy: $7.99 monthly or $35.88 yearly, equivalent to $2.99 per month.');
const questions = [
  ['What can I use for free?', 'BPM, musical key and Camelot analysis, track playback, result editing, Tap Tempo, and the metronome are free without an account. CSV export is also free. Save Results and Energy, Dance and Happy scores are included with an active Pro subscription.'],
  ['How is the yearly plan billed?', 'The yearly plan is charged as one payment of $35.88 for a year. That works out to $2.99 per month. The monthly plan costs $7.99 each month. Both renew automatically until canceled. Any applicable taxes are shown at checkout.'],
  ['Can I cancel my subscription?', 'Yes. Sign in with the same account you used to subscribe, open this Pricing page and choose Cancel renewal. You keep Pro until the end of the paid period. Canceling renewal does not automatically refund a previous payment. Contact support@bpmfder.com for billing help.'],
  ['Can I request a refund?', 'For your first paid subscription, request a full refund within 7 calendar days of the first successful charge. This applies to monthly and yearly plans without a usage quota. Verified duplicate charges, major service interruptions and mandatory legal refund rights are also covered. Email support@bpmfder.com with your account email and transaction ID. Full conditions are in the Terms of Service.'],
  ['What are the file limits?', 'Both Free and Pro allow up to 20 files per batch, 50 MB per file and 10 minutes per track. You can add another batch after analysis finishes. The optional Pro mood models take more time, depending on your device.'],
  ['How do saved results work?', 'Sign in with Pro and select the Save Results checkbox. Each new analysis result is automatically added to your history when it finishes. Uncheck it to stop saving. Existing results and later manual edits are not saved retroactively. Find them later under Saved Results. Audio files are never uploaded. Existing snapshots remain yours to view, export or delete after your subscription ends.'],
  ['Will subscribing upload my audio?', 'No. Audio analysis stays in your browser on both plans. Payment and subscription information is processed separately through Waffo Pancake. Audio files and unsaved results stay in the current page session. Pro members can choose Save Results to store track names and analysis measurements in their account. Saved snapshots remain available to view, export or delete after a subscription ends.'],
  ['What happens to tracks analyzed before upgrading?', 'When Pro is active, use Analyze with Pro in your current workspace to calculate the additional scores. If you left or refreshed the page, select the audio files again. Your original audio is never changed.'],
];
export default function Pricing() {
  return <><main className="pricing-main page-width">
    <section className="pricing-intro" aria-labelledby="pricing-heading"><span className="eyebrow">BPM FINDER / FREE & PRO</span><h1 id="pricing-heading">Your next mix.<br /><em>A little more insight.</em></h1><p>Find the beat for free. Go Pro for saved results, Energy, Dance & Happy.<br className="pricing-desktop-break" /> Choose the rhythm that works for you.</p></section>
    <PricingPlans />
    <div className="pricing-limits"><span><FileAudio size={14} /> Up to 50 MB · 10 min per file</span><span><Layers size={14} /> 20 files per batch · both plans</span></div>
    <div className="pricing-privacy"><ShieldCheck size={20} /><p><strong>Your tracks stay with you.</strong> Audio analysis runs on your device, right in your browser.</p></div>
    <section className="pricing-faq" aria-labelledby="pricing-faq-heading"><div><span className="eyebrow">A FEW PRACTICAL DETAILS</span><h2 id="pricing-faq-heading">Good to know<br /> before you press play.</h2></div><div className="pricing-questions">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
  </main><footer className="pricing-footer page-width"><span>BPM Finder. Made for the love of music.</span><div className="footer-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/">Back to home <ArrowRight size={14} /></Link></div></footer></>;
}
