import { useMemo } from "react";
import { useTelnyxClient } from "./useTelnyxClient";
import { TelnyxContext } from "./context";

export function TelnyxClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useTelnyxClient();
  const memo = useMemo(() => value, [value]);
  return (
    <TelnyxContext.Provider value={memo}>{children}</TelnyxContext.Provider>
  );
}
