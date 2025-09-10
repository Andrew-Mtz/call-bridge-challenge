import type { Request, Response } from "express";
import { verifyTelnyxSignature } from "../lib/webhookVerify";
import { sessions } from "../core/state";
import { env } from "../config";
import { dial, bridge } from "../services/telnyx.client";
import { TelnyxWebhook } from "@core/types";

function decodeClientState(
  b64?: string
): { sessionId: string; leg: "A" | "B" } | null {
  if (!b64) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function telnyxWebhook(req: Request, res: Response) {
  const raw = (req as any).rawBody as Buffer;
  if (!verifyTelnyxSignature(raw, req.headers)) {
    return res.status(400).send("invalid signature");
  }

  const body = req.body as TelnyxWebhook;
  const { event_type, payload } = body.data;
  const client = decodeClientState(payload.client_state);

  if (!client?.sessionId) {
    return res.status(200).send("ok");
  }

  const s = sessions.get(client.sessionId);
  if (!s) return res.status(200).send("ok");

  // 1) Guardar call_control_id al iniciarse cada leg
  if (event_type === "call.initiated") {
    if (client.leg === "A") {
      s.a.callControlId = payload.call_control_id;
      s.a.status = "dialing";
      s.status = "a_dialing";
    } else if (client.leg === "B") {
      s.b.callControlId = payload.call_control_id;
      s.b.status = "dialing";
      s.status = "b_dialing";
    }
    return res.status(200).send("ok");
  }

  // 2) Disparar B solo si A fue realmente contestado (candados extra)
  if (event_type === "call.answered" && client.leg === "A") {
    const isRightCall =
      s.a.callControlId && payload.call_control_id === s.a.callControlId;
    const numberMatches = payload.to === s.fromPhone; // el A se marcó hacia fromPhone

    if (isRightCall && numberMatches && s.status === "a_dialing") {
      s.a.status = "answered";
      s.status = "a_answered";

      const clientStateB = Buffer.from(
        JSON.stringify({ sessionId: s.sessionId, leg: "B" })
      ).toString("base64");

      await dial({
        to: s.toPhone,
        from: env.TELNYX_NUMBER!,
        connection_id: env.TELNYX_CONNECTION_ID!,
        client_state: clientStateB,
      });
      s.status = "b_dialing";
    }
    return res.status(200).send("ok");
  }

  // 3) Cuando B contesta, recién entonces bridge A <-> B
  if (event_type === "call.answered" && client.leg === "B") {
    const isRightCall =
      s.b.callControlId && payload.call_control_id === s.b.callControlId;
    const numberMatches = payload.to === s.toPhone;

    if (
      isRightCall &&
      numberMatches &&
      s.a.callControlId &&
      s.b.callControlId
    ) {
      await bridge(s.a.callControlId, s.b.callControlId);
      s.a.status = "bridged";
      s.b.status = "bridged";
      s.status = "bridged";
    }
    return res.status(200).send("ok");
  }

  if (event_type === "call.hangup") {
    s.status = "ended";
    s.a.status = s.a.status === "bridged" ? "ended" : s.a.status;
    s.b.status = s.b.status === "bridged" ? "ended" : s.b.status;
    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
}
