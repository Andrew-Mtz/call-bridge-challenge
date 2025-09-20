import { createContext, useContext } from "react";
import type { useTelnyxClient } from "./useTelnyxClient";

export type TelnyxCtx = ReturnType<typeof useTelnyxClient> | null;

export const TelnyxContext = createContext<TelnyxCtx>(null);

export function useTelnyx() {
  const v = useContext(TelnyxContext);
  if (!v)
    throw new Error("useTelnyx must be used within <TelnyxClientProvider>");
  return v;
}
