"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { useReducedMotion } from "./reduced-motion-provider";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;

    if (!element || prefersReducedMotion) {
      return;
    }

    let observer: IntersectionObserver | undefined;

    const context = gsap.context(() => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) {
            return;
          }

          observer?.disconnect();
          gsap.fromTo(
            element,
            { opacity: 0.35, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              delay,
              ease: "power2.out",
              clearProps: "opacity,transform",
            },
          );
        },
        { threshold: 0.16 },
      );

      observer.observe(element);
    }, element);

    return () => {
      observer?.disconnect();
      context.revert();
    };
  }, [delay, prefersReducedMotion]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
