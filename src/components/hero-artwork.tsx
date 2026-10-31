'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion';

export default function HeroArtwork({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
      const disc = element.querySelector('.record-disc');
      const scene = element.querySelector('.hero-art-scene');
      const sleeve = element.querySelector('.record-sleeve');
      if (!disc || !scene || !sleeve) return;

      const spin = gsap.to(disc, { rotation: '+=360', duration: 18, ease: 'none', repeat: -1, paused: true });
      let inView = false;
      const sync = () => spin.paused(!inView || document.hidden);
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        sync();
      });
      observer.observe(element);
      document.addEventListener('visibilitychange', sync);

      const pointerMedia = gsap.matchMedia();
      pointerMedia.add('(hover: hover) and (pointer: fine)', () => {
        // Separate layers keep pointer motion independent of the intro and spin.
        const tiltX = gsap.quickTo(scene, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const tiltY = gsap.quickTo(scene, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        const lift = gsap.to(sleeve, { x: -5, y: -5, rotation: -1, duration: 0.45, ease: 'power2.out', paused: true });
        const move = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          tiltX(((event.clientY - rect.top) / rect.height - 0.5) * -6);
          tiltY(((event.clientX - rect.left) / rect.width - 0.5) * 8);
        };
        const enter = () => lift.play();
        const leave = () => { tiltX(0); tiltY(0); lift.reverse(); };
        element.addEventListener('pointermove', move);
        element.addEventListener('pointerenter', enter);
        element.addEventListener('pointerleave', leave);
        return () => {
          element.removeEventListener('pointermove', move);
          element.removeEventListener('pointerenter', enter);
          element.removeEventListener('pointerleave', leave);
        };
      });

      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', sync);
        pointerMedia.revert();
      };
    });
    return () => media.revert();
  }, { scope: root });

  return <div className="hero-art" ref={root} aria-hidden="true">
    <div className="hero-art-scene" aria-hidden="true">
      <div className="orbit orbit-one"><div className="record-disc"><div className="disc-label"><span>BPM FINDER</span><i /><span>SIDE A · 33⅓</span></div><span className="disc-index" /></div></div>
      <div className="orbit orbit-two" />
      <div className="record-sleeve">{children}</div>
    </div>
  </div>;
}
