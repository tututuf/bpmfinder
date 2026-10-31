'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';

export default function SiteMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', (_context, contextSafe) => {
      const find = (selector: string) => Array.from(element.querySelectorAll<HTMLElement>(selector));
      const intro = gsap.timeline({ defaults: { duration: 0.65, ease: 'power3.out', clearProps: 'opacity,transform' } });
      const introCopy = find('.hero-copy > *, .blogs-intro > *');
      const art = find('.hero-art').filter(node => node.offsetWidth > 0);
      if (introCopy.length) intro.from(introCopy, { opacity: 0, y: 20, stagger: 0.1 }, 0.12);
      if (art.length) {
        intro.from(art, { opacity: 0, y: 18, duration: 0.8 }, 0.15)
          .from(find('.record-card'), { x: -52, rotation: -10, duration: 0.9 }, 0.18)
          .from(find('.orbit-one'), { x: -60, duration: 1, ease: 'power2.out' }, 0.25)
          .from(find('.record-card .waveform i'), { scaleY: 0.22, transformOrigin: '50% 50%', duration: 0.45, stagger: { amount: 0.25 } }, 0.5);
      }
      // The workspace itself is never transformed: it contains fixed-position menus.
      const workspaceIntro = find('.workspace .tool-tabs, .dropzone > *, .upload-bottom');
      if (workspaceIntro.length) intro.from(workspaceIntro, { opacity: 0, y: 10, duration: 0.45, stagger: 0.045 }, 0.35);

      const revealTargets = find([
        '.results-heading', '.benefits > div', '.guide-nav', '.section-heading',
        '.usage-steps > li', '.measurement-methods > article', '.counting-card',
        '.tempo-check', '.result-glossary > article', '.mixing-example', '.basics-next',
        '.faq-intro', '.faq-list > details', '.last-note', '.site-footer',
        '.blogs-empty', '.blogs-guides > h2', '.blogs-guides > div > a', '.blogs-footer',
      ].join(', '));
      const reveals = new Map<HTMLElement, gsap.core.Tween>();
      // Register deferred tweens with this media context. Registering them with
      // the enclosing React context during onEnter creates a context cycle.
      const reveal = contextSafe!((target: HTMLElement) => {
        if (target.contains(document.activeElement)) return;
        // Hide only when the entrance actually starts. Skipped sections, no-JS
        // visits and failed hydration always retain the readable HTML content.
        reveals.set(target, gsap.from(target, {
          opacity: 0, y: 18, duration: 0.55, ease: 'power2.out',
          clearProps: 'opacity,transform',
        }));
      });
      const triggers = revealTargets.map(target => ScrollTrigger.create({
        trigger: target,
        start: 'top 93%',
        once: true,
        onEnter: () => reveal(target),
      }));
      const finishFocusedReveal = (event: FocusEvent) => {
        if (!(event.target instanceof Node)) return;
        if (event.target instanceof Element && event.target.closest('.hero, .workspace, .blogs-intro')) intro.progress(1);
        for (const [target, animation] of reveals) {
          if (target.contains(event.target)) animation.progress(1);
        }
      };
      element.addEventListener('focusin', finishFocusedReveal);

      const finePointer = gsap.matchMedia();
      finePointer.add('(hover: hover) and (pointer: fine)', () => {
        const listeners: Array<() => void> = [];
        for (const target of find('.tutorial-screenshot > a')) {
          const hover = gsap.to(target, { y: -3, duration: 0.25, ease: 'power2.out', paused: true });
          const enter = () => hover.play();
          const leave = () => hover.reverse();
          target.addEventListener('pointerenter', enter);
          target.addEventListener('pointerleave', leave);
          listeners.push(() => { target.removeEventListener('pointerenter', enter); target.removeEventListener('pointerleave', leave); });
        }
        for (const button of find('.primary-button, .guide-link, .last-note > a, .blogs-guides > div > a')) {
          const arrow = button.querySelector('.lucide-arrow-right, .lucide-arrow-up-right');
          if (!arrow) continue;
          const hover = gsap.to(arrow, { x: 3, duration: 0.22, ease: 'power2.out', paused: true });
          const enter = () => hover.play();
          const leave = () => hover.reverse();
          button.addEventListener('pointerenter', enter);
          button.addEventListener('pointerleave', leave);
          listeners.push(() => { button.removeEventListener('pointerenter', enter); button.removeEventListener('pointerleave', leave); });
        }
        return () => listeners.forEach(remove => remove());
      });

      // Uploaded results and native <details> alter the height of the page.
      // ResizeObserver refreshes measurements only when that layout changes.
      let refreshFrame = 0;
      const refresh = () => {
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      };
      const resize = new ResizeObserver(refresh);
      const main = element.querySelector('main');
      if (main) resize.observe(main);
      return () => {
        resize.disconnect();
        cancelAnimationFrame(refreshFrame);
        element.removeEventListener('focusin', finishFocusedReveal);
        finePointer.revert();
        triggers.forEach(trigger => trigger.kill());
      };
    });
    return () => media.revert();
  }, { scope: root, dependencies: [pathname], revertOnUpdate: true });

  return <div ref={root} className="site-motion">{children}</div>;
}
