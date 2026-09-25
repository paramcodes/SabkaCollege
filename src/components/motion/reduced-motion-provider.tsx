"use client";

import * as React from "react";

type ReducedMotionContextValue = boolean;

const ReducedMotionContext = React.createContext<ReducedMotionContextValue>(false);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const getReducedMotionSnapshot = () =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

const getServerSnapshot = () => false;

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot,
  );

  return (
    <ReducedMotionContext.Provider value={prefersReducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  return React.useContext(ReducedMotionContext);
}
