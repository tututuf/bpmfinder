import type { Metadata } from 'next';
import GoogleAnalytics from '@/components/google-analytics';
import SiteMotion from '@/components/site-motion';
import AuthProvider from '@/components/auth-provider';
import SiteHeader from '@/components/content-header';
import { siteOrigin, siteIdentitySchema } from '@/lib/site';
import StructuredData from '@/components/structured-data';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/ibm-plex-mono/400.css';
import './globals.css';
import './readability.css';
import './theme.css';
import './analysis.css';
import './homepage.css';
import './auth.css';
import './resources.css';
import './workspace.css';
import './legal-links.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  title: 'Find Song BPM & Musical Key Online, Free | BPM Finder',
  description: 'Find song BPM, musical key and Camelot with our free online BPM finder. Analyze audio files privately in your browser, tap tempo, and export CSV for free. Save results to your account with Pro.',
  robots: { index: true, follow: true },
  openGraph: { title: 'Find Song BPM & Musical Key Online, Free | BPM Finder', description: 'Analyze the tempo and key of your audio files in your browser. Free BPM detection, Tap Tempo and a metronome. Your audio stays on your device.', type: 'website' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><StructuredData value={siteIdentitySchema()} /><AuthProvider><SiteHeader /><SiteMotion>{children}</SiteMotion></AuthProvider>{process.env.NODE_ENV === 'production' && <GoogleAnalytics />}</body></html>;
}
