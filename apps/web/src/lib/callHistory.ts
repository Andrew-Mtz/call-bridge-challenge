// Tiny call history helper (localStorage-backed).
// Keeps up to MAX entries per key, newest first, de-duplicated.

const LS_PREFIX = "callpad:";
const MAX = 20;

function safeParse(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function readHistory(key: string): string[] {
  return safeParse(localStorage.getItem(LS_PREFIX + key));
}

export function addHistory(key: string, num: string) {
  if (!num) return;
  const current = readHistory(key).filter(n => n !== num);
  const next = [num, ...current].slice(0, MAX);
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(next));
}

export function clearHistory(key: string) {
  localStorage.removeItem(LS_PREFIX + key);
}
