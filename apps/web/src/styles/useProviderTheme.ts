import { useEffect } from "react";

export function useProviderTheme(provider: "telnyx" | "sinch" | "infobip") {
  useEffect(() => {
    document.body.setAttribute("data-provider", provider);
  }, [provider]);
}
