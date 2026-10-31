'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Image, { type StaticImageData } from 'next/image';
import { Expand, X } from 'lucide-react';
import { useInterfaceMotion } from '@/lib/motion';

export default function TutorialScreenshot({ image, original, alt, caption, compact = false }: { image: StaticImageData; original: string; alt: string; caption: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useInterfaceMotion(dialog, [open], '.screenshot-lightbox-panel', true);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.overflow = 'hidden';
    if (scrollbar) document.body.style.paddingRight = `${padding + scrollbar}px`;
    panel.showModal();
    return () => {
      panel.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [open]);

  const show = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  return <figure className={`tutorial-screenshot${compact ? ' tutorial-screenshot-compact' : ''}`}>
    <a href={`/images/tutorial/${original}.webp`} onClick={show} aria-haspopup="dialog" aria-label={`View full-size screenshot: ${caption}`}>
      <Image src={image} alt={alt} sizes={compact ? '(max-width: 760px) calc(100vw - 80px), 440px' : '(max-width: 760px) calc(100vw - 32px), (max-width: 1050px) 58vw, 720px'} />
    </a>
    <figcaption><span>{caption}</span><a href={`/images/tutorial/${original}.webp`} onClick={show} aria-haspopup="dialog" aria-label={`View larger: ${caption}`}>View larger <Expand size={13} aria-hidden="true" /></a></figcaption>
    {open && createPortal(<dialog ref={dialog} className="screenshot-lightbox" aria-label={caption} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="screenshot-lightbox-panel">
        <div className="screenshot-lightbox-header"><p>{caption}</p><button type="button" className="icon-button" aria-label="Close image preview" onClick={() => setOpen(false)} autoFocus><X size={22} /></button></div>
        <div className="screenshot-lightbox-image"><Image src={image} alt={alt} unoptimized /></div>
      </div>
    </dialog>, document.body)}
  </figure>;
}
