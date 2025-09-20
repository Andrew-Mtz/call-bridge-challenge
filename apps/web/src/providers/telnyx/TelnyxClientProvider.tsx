import { useTelnyxClient } from "./useTelnyxClient";
import { TelnyxContext } from "./context";

export function TelnyxClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useTelnyxClient();
  return (
    <TelnyxContext.Provider value={value}>{children}</TelnyxContext.Provider>
  );
}
