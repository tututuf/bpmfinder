'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Brand from '@/components/brand';
import AuthControl from '@/components/auth-control';
import './content-header.css';

export default function SiteHeader() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState({ pathname, open: false });
  const open = menu.pathname === pathname && menu.open;
  const close = () => setMenu({ pathname, open: false });
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu({ pathname, open: false }); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setMenu({ pathname, open: false });
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [open, pathname]);
  return <header ref={root} className="site-header"><div className="header-inner">
    <Link className="brand" href="/" aria-label="BPM Finder home" onClick={close}><Brand /></Link>
    <nav id="main-navigation" className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
      {([['/pricing', 'Pricing'], ['/blogs', 'Blogs'], ['/saved-results', 'Saved Results']] as const).map(([href, label]) => <Link key={href} href={href} className={pathname === href ? 'nav-active' : undefined} aria-current={pathname === href ? 'page' : undefined} onClick={close}>{label}</Link>)}
    </nav>
    <span className="header-note"><i /> A little tool. A better mix.</span>
    <AuthControl />
    <button ref={toggle} className="mobile-toggle icon-button" aria-label="Toggle navigation" aria-controls="main-navigation" aria-expanded={open} onClick={() => setMenu({ pathname, open: !open })}>{open ? <X /> : <Menu />}</button>
  </div></header>;
}
