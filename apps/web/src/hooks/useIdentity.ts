import { useState } from "react";

export function useIdentity(storageKey: string) {
  const [myIdentity, setMyIdentity] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  const [customIdentity, setCustomIdentity] = useState(myIdentity);
  const [copied, setCopied] = useState(false);

  function persistIdentity(id: string) {
    setMyIdentity(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* empty */
    }
  }
  function randomize() {
    setCustomIdentity(crypto.randomUUID());
  }
  async function copy() {
    if (!myIdentity) return;
    try {
      await navigator.clipboard.writeText(myIdentity);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* empty */
    }
  }

  return {
    myIdentity,
    customIdentity,
    setCustomIdentity,
    persistIdentity,
    randomize,
    copy,
    copied,
  };
}
