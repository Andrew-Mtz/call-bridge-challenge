import { useMemo } from "react";
import { useInfobipClient } from "./useInfobipClient";
import { InfobipContext } from "./context";

export function InfobipClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useInfobipClient();
  // memorizamos contra value.state (o lo que uses) para evitar renders
  const memo = useMemo(() => value, [value]);
  return (
    <InfobipContext.Provider value={memo}>{children}</InfobipContext.Provider>
  );
}
