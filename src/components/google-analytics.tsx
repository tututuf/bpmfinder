'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const analytics = window as typeof window & { gtag?: (...args: unknown[]) => void };
    analytics.gtag?.('event', 'page_view', {
      page_location: window.location.origin + pathname,
      page_title: document.title,
      send_to: 'G-Z0FT82KR6V',
    });
  }, [pathname, ready]);
  return <>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-Z0FT82KR6V" strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive" onReady={() => setReady(true)}>{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-Z0FT82KR6V', { send_page_view: false });`}</Script>
  </>;
}
