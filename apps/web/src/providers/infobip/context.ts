import { createContext, useContext } from "react";
import type { useInfobipClient } from "./useInfobipClient";

// el contexto sólo mantiene el tipo del hook
export type InfobipCtx = ReturnType<typeof useInfobipClient> | null;

export const InfobipContext = createContext<InfobipCtx>(null);

// hook para consumir el contexto (no es un componente)
export function useInfobip() {
  const v = useContext(InfobipContext);
  if (!v)
    throw new Error("useInfobip must be used within <InfobipClientProvider>");
  return v;
}
