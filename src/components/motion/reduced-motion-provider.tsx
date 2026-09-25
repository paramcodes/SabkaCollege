"use client";

import * as React from "react";

type ReducedMotionContextValue = boolean;

const ReducedMotionContext = React.createContext<ReducedMotionContextValue>(false);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return (
    <ReducedMotionContext.Provider value={prefersReducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  return React.useContext(ReducedMotionContext);
}
