import { useInfobipClient } from "./useInfobipClient";
import { InfobipContext } from "./context";

export function InfobipClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useInfobipClient();
  return (
    <InfobipContext.Provider value={value}>{children}</InfobipContext.Provider>
  );
}
