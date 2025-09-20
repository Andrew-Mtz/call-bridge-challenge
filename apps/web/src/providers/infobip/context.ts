import { createContext, useContext } from "react";
import type { useInfobipClient } from "./useInfobipClient";

export type InfobipCtx = ReturnType<typeof useInfobipClient> | null;

export const InfobipContext = createContext<InfobipCtx>(null);

export function useInfobip() {
  const v = useContext(InfobipContext);
  if (!v)
    throw new Error("useInfobip must be used within <InfobipClientProvider>");
  return v;
}
