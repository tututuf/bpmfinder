'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ContentsItem = { id: string; label: string; shortLabel?: string };

export default function ArticleContents({ items }: { items: ContentsItem[] }) {
  const inline = useRef<HTMLElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(items[0]?.id || '');

  useEffect(() => {
    const contents = inline.current;
    const layout = contents?.closest('.article-reading-layout');
    const target = layout?.querySelector<HTMLElement>('[data-article-sidebar]');
    if (!contents || !layout || !target) return;
    setMount(target);
    const desktop = window.matchMedia('(min-width: 1200px)');
    const sections = items.map(item => document.getElementById(item.id));
    let frame = 0;
    const update = () => {
      frame = 0;
      // The first heading lands below both the document scroll padding and its
      // own margin. Keep the side navigation visible when jumping back to it.
      setVisible(desktop.matches && contents.getBoundingClientRect().bottom <= 64 && layout.getBoundingClientRect().bottom > 32);
      let current = items[0]?.id || '';
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= 120) current = items[index].id;
      });
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(layout);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener('change', schedule);
    };
  }, [items]);

  const links = (compact: boolean) => <ol>{items.map(item => <li key={item.id}><a href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined}>{compact ? item.shortLabel || item.label : item.label}</a></li>)}</ol>;

  return <>
    <nav ref={inline} className="article-contents" aria-label="Article contents"><span>IN THIS GUIDE</span>{links(false)}</nav>
    {mount && createPortal(<nav className="article-sidebar-contents" aria-label="Sticky article contents" hidden={!visible}><span>IN THIS GUIDE</span>{links(true)}</nav>, mount)}
  </>;
}
