import type { Request, Response } from "express";
import { verifyTelnyxSignature } from "../lib/webhookVerify";
import { sessions } from "../core/state";
import { env } from "../config";
import { dial, bridge } from "../services/telnyx.client";
import { TelnyxWebhook } from "@core/types";
import { publishSession } from "@core/events";

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

const seenEvents = new Set<string>();
function isDuplicate(id?: string) {
  if (!id) return false;
  if (seenEvents.has(id)) return true;
  seenEvents.add(id);
  // keep it bounded
  if (seenEvents.size > 5000) {
    // cheap reset; OK for dev
    seenEvents.clear();
  }
  return false;
}

function log(sessionId: string | null, msg: string, extra?: any) {
  const prefix = sessionId ? `[WH ${sessionId}]` : `[WH]`;
  if (extra !== undefined) {
    console.log(prefix, msg, extra);
  } else {
    console.log(prefix, msg);
  }
}

export async function telnyxWebhook(req: Request, res: Response) {
  const raw = (req as any).rawBody as Buffer;

  // 0) Verify signature
  if (!verifyTelnyxSignature(raw, req.headers)) {
    console.warn("[WH] invalid signature");
    return res.status(400).send("invalid signature");
  }

  const body = req.body as TelnyxWebhook;
  const eventId = (body as any)?.data?.id || (body as any)?.id || undefined;
  const { event_type, payload } = body.data;
  const client = decodeClientState(payload.client_state);
  const sessionId = client?.sessionId ?? null;

  // top-level log for every event
  log(sessionId, `← ${event_type}`, {
    eventId,
    to: payload.to,
    from: payload.from,
    call_control_id: payload.call_control_id,
    leg: client?.leg,
  });

  // 1) Deduplicate (optional but helpful if ngrok/infra resends)
  if (isDuplicate(eventId)) {
    log(sessionId, `duplicate event ignored`, { eventId, event_type });
    return res.status(200).send("ok");
  }

  if (!client?.sessionId) {
    log(null, "missing/invalid client_state; ack and drop");
    return res.status(200).send("ok");
  }

  const s = sessions.get(client.sessionId);
  if (!s) {
    log(sessionId, "session not found; ack and drop");
    return res.status(200).send("ok");
  }

  // 2) call.initiated (store call_control_id and state)
  if (event_type === "call.initiated") {
    if (client.leg === "A") {
      s.a.callControlId = payload.call_control_id;
      s.a.status = "dialing";
      s.status = "a_dialing";
      log(sessionId, "A leg initiated", {
        callControlId: s.a.callControlId,
        to: payload.to,
      });
    } else if (client.leg === "B") {
      s.b.callControlId = payload.call_control_id;
      s.b.status = "dialing";
      s.status = "b_dialing";
      log(sessionId, "B leg initiated", {
        callControlId: s.b.callControlId,
        to: payload.to,
      });
    }
    publishSession(s.sessionId, s);
    return res.status(200).send("ok");
  }

  // 3) A answered → dial B (with extra guards and logs)
  if (event_type === "call.answered" && client.leg === "A") {
    const isRightCall =
      !!s.a.callControlId && payload.call_control_id === s.a.callControlId;
    const numberMatches = payload.to === s.fromPhone;

    log(sessionId, "A answered", {
      isRightCall,
      numberMatches,
      status: s.status,
      aCallControlId: s.a.callControlId,
      webhookCallControlId: payload.call_control_id,
      expectedTo: s.fromPhone,
      gotTo: payload.to,
    });

    if (isRightCall && numberMatches && s.status === "a_dialing") {
      s.a.status = "answered";
      s.status = "a_answered";

      // Prepare client_state & command_id for B dial
      const clientStateB = Buffer.from(
        JSON.stringify({ sessionId: s.sessionId, leg: "B" })
      ).toString("base64");

      // Optional idempotency key for Dial (see note below)
      const commandIdB =
        (s as any).b?.dialCommandId || `dial:${s.sessionId}:B:1`;
      (s as any).b = { ...(s as any).b, dialCommandId: commandIdB };

      log(sessionId, "Dialing B", {
        to: s.toPhone,
        from: env.TELNYX_NUMBER,
        command_id: commandIdB,
      });

      await dial({
        to: s.toPhone,
        from: env.TELNYX_NUMBER!,
        connection_id: env.TELNYX_CONNECTION_ID!,
        client_state: clientStateB,
        command_id: commandIdB, // ← will be ignored by Telnyx if duplicate
      });

      s.status = "b_dialing";
    }

    publishSession(s.sessionId, s);
    return res.status(200).send("ok");
  }

  // 4) B answered → bridge A <-> B
  if (event_type === "call.answered" && client.leg === "B") {
    const isRightCall =
      !!s.b.callControlId && payload.call_control_id === s.b.callControlId;
    const numberMatches = payload.to === s.toPhone;

    s.b.status = "answered";
    log(sessionId, "B answered", {
      isRightCall,
      numberMatches,
      aCallControlId: s.a.callControlId,
      bCallControlId: s.b.callControlId,
    });
    publishSession(s.sessionId, s);

    if (
      isRightCall &&
      numberMatches &&
      s.a.callControlId &&
      s.b.callControlId
    ) {
      log(sessionId, "Bridging A <-> B", {
        a: s.a.callControlId,
        b: s.b.callControlId,
      });
      await bridge(s.a.callControlId, s.b.callControlId);
      s.a.status = "bridged";
      s.b.status = "bridged";
      s.status = "bridged";
      publishSession(s.sessionId, s);
      log(sessionId, "Bridge complete");
    }

    return res.status(200).send("ok");
  }

  // 5) call.bridged (confirmation that they are bridged)
  if (event_type === "call.bridged") {
    if (client.leg === "A") s.a.status = "bridged";
    if (client.leg === "B") s.b.status = "bridged";
    s.status = "bridged";
    publishSession(s.sessionId, s);
    log(sessionId, "Bridged (webhook confirm)");
    return res.status(200).send("ok");
  }

  // 6) Hangup
  if (event_type === "call.hangup") {
    const cause = (payload as any)?.hangup_cause;
    log(sessionId, "Hangup", { cause });
    s.status = "ended";
    s.a.status = s.a.status === "bridged" ? "ended" : s.a.status;
    s.b.status = s.b.status === "bridged" ? "ended" : s.b.status;
    publishSession(s.sessionId, s);
    return res.status(200).send("ok");
  }

  // 7) Unhandled -> log + ack
  log(sessionId, `Unhandled event: ${event_type}`);
  return res.status(200).send("ok");
}
