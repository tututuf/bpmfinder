'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DependencyList, RefObject } from 'react';

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };

// Menus keep their positioning transforms; only their opacity is animated.
export function useInterfaceMotion(scope: RefObject<HTMLElement | null>, dependencies: DependencyList, selector: string, move = false) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const targets = scope.current?.querySelectorAll<HTMLElement>(selector);
      if (!targets?.length) return;
      gsap.from(targets, {
        opacity: 0,
        ...(move ? { y: 7 } : {}),
        duration: move ? 0.28 : 0.2,
        ease: 'power2.out',
        clearProps: move ? 'opacity,transform' : 'opacity',
      });
    });
    return () => media.revert();
  }, { scope, dependencies: [...dependencies], revertOnUpdate: true });
}
