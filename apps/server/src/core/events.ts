import { EventEmitter } from "events";
import type { Session } from "@core/state";

const emitters = new Map<string, EventEmitter>();
const counters = new Map<string, number>();

export function getEmitter(sessionId: string) {
  let em = emitters.get(sessionId);
  if (!em) {
    em = new EventEmitter();
    emitters.set(sessionId, em);
  }
  return em;
}

function nextSeq(sessionId: string) {
  const cur = counters.get(sessionId) ?? 0;
  const next = cur + 1;
  counters.set(sessionId, next);
  return next;
}

export function publishSession(sessionId: string, session: Session) {
  const em = getEmitter(sessionId);
  em.emit("update", { seq: nextSeq(sessionId), session });
}
