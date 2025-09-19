import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { sessions } from "@core/state";
import { env } from "@config";
import { publishSession } from "@core/events";
import { getProviderByName } from "@providers/factory";

const router = Router();

const PhoneE164 = z.string().regex(/^\+\d{7,15}$/);

const StartSchema = z.object({
  provider: z.enum(["telnyx", "infobip"]).default("telnyx"),
  fromPhone: PhoneE164,
  toPhone: PhoneE164,
});

router.post("/bridge", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { provider: providerName, fromPhone, toPhone } = parsed.data;
  const sessionId = uuid();

  if (providerName === "infobip") {
    return res.status(400).json({
      error:
        "PSTN bridge is not implemented for Infobip. Use Telnyx or WebRTC flow.",
    });
  }

  const provider = getProviderByName(providerName);

  // create session and mark leg A
  sessions.set(sessionId, {
    sessionId,
    provider: providerName,
    fromPhone,
    toPhone,
    a: { status: "dialing" },
    b: { status: "dialing" },
    status: "a_dialing",
  });
  publishSession(sessionId, sessions.get(sessionId)!);

  // client_state base64 to correlate webhooks from A
  const clientStateA = Buffer.from(
    JSON.stringify({ sessionId, leg: "A" })
  ).toString("base64");

  try {
    await provider.dial({
      to: fromPhone,
      from: env.TELNYX_NUMBER!,
      sessionId,
      leg: "A",
      commandId: `dial:${sessionId}:A:1:${providerName}`,
    });

    return res.status(202).json({ sessionId });
  } catch (e: any) {
    sessions.delete(sessionId);
    return res.status(502).json({ error: e.message });
  }
});

export default router;
