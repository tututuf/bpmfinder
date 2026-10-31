import type { Metadata } from 'next';
import { ResourceFooter } from '@/components/tool-page';
import BillingReturn from '@/components/billing-return';
import '../../pricing/pricing.css';
export const metadata: Metadata = { title: 'Subscription confirmation — BPM Finder', robots: { index: false, follow: false } };
export default function Page() { return <><main><BillingReturn /></main><ResourceFooter /></>; }
