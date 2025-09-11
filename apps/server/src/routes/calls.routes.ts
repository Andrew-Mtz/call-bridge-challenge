// apps/server/src/routes.calls.ts
import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { sessions } from "../core/state";
import { dial } from "../services/telnyx.client";
import { env } from "../config";
import { publishSession } from "@core/events";

const router = Router();

const PhoneE164 = z.string().regex(/^\+\d{7,15}$/);
const StartSchema = z.object({
  fromPhone: PhoneE164,
  toPhone: PhoneE164,
});

router.post("/bridge", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { fromPhone, toPhone } = parsed.data;
  const sessionId = uuid();

  // crear sesión y marcar leg A
  sessions.set(sessionId, {
    sessionId,
    fromPhone,
    toPhone,
    a: { status: "dialing" },
    b: { status: "dialing" },
    status: "a_dialing",
  });
  publishSession(sessionId, sessions.get(sessionId)!);

  // client_state base64 para correlacionar los webhooks de A
  const clientStateA = Buffer.from(
    JSON.stringify({ sessionId, leg: "A" })
  ).toString("base64");

  try {
    await dial({
      to: fromPhone,
      from: env.TELNYX_NUMBER!,
      connection_id: env.TELNYX_CONNECTION_ID!,
      client_state: clientStateA,
    });

    return res.status(202).json({ sessionId });
  } catch (e: any) {
    sessions.delete(sessionId);
    return res.status(502).json({ error: e.message });
  }
});

export default router;
