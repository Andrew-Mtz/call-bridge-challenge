import { useState } from "react";

export function useIdentity(storageKey: string) {
  const displayKey = `${storageKey}:displayName`;
  const [myIdentity, setMyIdentity] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(displayKey) ||
        localStorage.getItem(storageKey) ||
        ""
      );
    } catch {
      return "";
    }
  });

  const [copied, setCopied] = useState(false);

  function persistIdentity(id: string) {
    setMyIdentity(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* empty */
    }
    setDisplayName(prev => {
      if (!prev) {
        try {
          localStorage.setItem(displayKey, id);
        } catch {
          /* empty */
        }
        return id;
      }
      return prev;
    });
  }

  function persistDisplayName(name: string) {
    setDisplayName(name);
    try {
      localStorage.setItem(displayKey, name);
    } catch {
      /* empty */
    }
  }

  function randomize() {
    const rnd = crypto.randomUUID();
    persistIdentity(rnd);
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
    displayName,
    setDisplayName,
    persistDisplayName,
    persistIdentity,
    randomize,
    copy,
    copied,
  };
}
