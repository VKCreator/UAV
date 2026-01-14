// src/context/LayoutContext.tsx
import * as React from "react";

export interface LayoutContextValue {
  setIsNavigationExpanded: (expanded: boolean) => void;
}

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function useLayout() {
  const context = React.useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}