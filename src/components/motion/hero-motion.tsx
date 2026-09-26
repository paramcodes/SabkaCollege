"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { useReducedMotion } from "./reduced-motion-provider";

type HeroMotionProps = {
  children: ReactNode;
  className?: string;
};

export function HeroMotion({ children, className }: HeroMotionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const hero = heroRef.current;

    if (!hero || prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-hero-item]", hero);

      if (items.length === 0) {
        return;
      }

      gsap.fromTo(
        items,
        { opacity: 0.3, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    }, hero);

    return () => context.revert();
  }, [prefersReducedMotion]);

  return (
    <div ref={heroRef} className={className}>
      {children}
    </div>
  );
}
