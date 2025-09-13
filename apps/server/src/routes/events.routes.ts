import { Router } from "express";
import { sessions } from "@core/state";
import { getEmitter } from "@core/events";

const router = Router();

router.get("/:sessionId/events", (req, res) => {
  const { sessionId } = req.params;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const em = getEmitter(sessionId);

  const send = (evt: { seq: number; session: any }) => {
    res.write(`id: ${evt.seq}\n`);
    res.write(`event: update\n`);
    res.write(`data: ${JSON.stringify({ session: evt.session })}\n\n`);
  };

  // Send snapshot (if session already exists)
  const snap = sessions.get(sessionId);
  if (snap) send({ seq: 0, session: snap });

  // Subscribe to updates
  const onUpdate = (evt: any) => send(evt);
  em.on("update", onUpdate);

  // Heartbeat to keep proxies happy
  const hb = setInterval(() => res.write(`: ping\n\n`), 25000);

  const close = () => {
    clearInterval(hb);
    em.off("update", onUpdate);
    res.end();
  };

  req.on("close", close);
  req.on("aborted", close);
});

export default router;
