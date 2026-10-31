import type { Metadata } from 'next';
import SiteMotion from '@/components/site-motion';
import AuthProvider from '@/components/auth-provider';
import SiteHeader from '@/components/content-header';
import { siteOrigin } from '@/lib/site';
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

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  title: 'BPM Finder — Find Song BPM & Musical Key Online, Free',
  description: 'Find song BPM, musical key and Camelot with our free online BPM finder. Analyze audio files privately in your browser, tap tempo, and export CSV for free. Save results to your account with Pro.',
  robots: { index: true, follow: true },
  openGraph: { title: 'BPM Finder — Find Song BPM & Musical Key Online, Free', description: 'Analyze the tempo and key of your audio files in your browser. Free BPM detection, Tap Tempo and a metronome. Your audio stays on your device.', type: 'website' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><AuthProvider><SiteHeader /><SiteMotion>{children}</SiteMotion></AuthProvider></body></html>;
}
