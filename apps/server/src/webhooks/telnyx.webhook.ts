import type { Request, Response } from "express";
import { sessions } from "@core/state";
import { env } from "@config";
import { TelnyxWebhook } from "@core/types";
import { publishSession } from "@core/events";
import { getProvider } from "providers/factory";

const provider = getProvider();

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
  if (!provider.verifySignature(raw, req.headers)) {
    console.warn("[WH] invalid signature");
    return res.status(400).send("invalid signature");
  }

  const evt = provider.parseEvent(req.body as TelnyxWebhook);
  if (!evt) return res.status(200).send("ok");

  const sessionId = evt.sessionId ?? null;

  // top-level log for every event
  log(sessionId, `← ${evt.type}`, {
    eventId: evt.id,
    to: evt.to,
    from: evt.from,
    call_control_id: evt.callControlId,
    leg: evt.leg,
  });

  // 1) Deduplicate (optional but helpful if ngrok/infra resends)
 if (isDuplicate(evt.id)) {
    log(sessionId, `duplicate event ignored`, { eventId: evt.id, event_type: evt.type });
    return res.status(200).send("ok");
  }

  if (!sessionId) {
    log(null, "missing/invalid client_state; ack and drop");
    return res.status(200).send("ok");
  }

  const s = sessions.get(sessionId);
  if (!s) {
    log(sessionId, "session not found; ack and drop");
    return res.status(200).send("ok");
  }

  // 2) call.initiated (store call_control_id and state)
  if (evt.type === "initiated") {
    if (evt.leg === "A") {
      s.a.callControlId = evt.callControlId;
      s.a.status = "dialing";
      s.status = "a_dialing";
      log(sessionId, "A leg initiated", { callControlId: s.a.callControlId, to: evt.to });
    } else if (evt.leg === "B") {
      s.b.callControlId = evt.callControlId;
      s.b.status = "dialing";
      s.status = "b_dialing";
      log(sessionId, "B leg initiated", { callControlId: s.b.callControlId, to: evt.to });
    }
    publishSession(s.sessionId, s);
    return res.status(200).send("ok");
  }

  // 3) A answered → dial B
  if (evt.type === "answered" && evt.leg === "A") {
    const isRightCall = !!s.a.callControlId && evt.callControlId === s.a.callControlId;
    const numberMatches = evt.to === s.fromPhone;

    log(sessionId, "A answered", {
      isRightCall,
      numberMatches,
      status: s.status,
      aCallControlId: s.a.callControlId,
      webhookCallControlId: evt.callControlId,
      expectedTo: s.fromPhone,
      gotTo: evt.to,
    });

    if (isRightCall && numberMatches && s.status === "a_dialing") {
      s.a.status = "answered";
      s.status = "a_answered";

      // idempotency para B
      const commandIdB = (s as any).b?.dialCommandId || `dial:${s.sessionId}:B:1`;
      (s as any).b = { ...(s as any).b, dialCommandId: commandIdB };

      log(sessionId, "Dialing B", {
        to: s.toPhone,
        from: env.TELNYX_NUMBER,
        command_id: commandIdB,
      });

      await provider.dial({
        to: s.toPhone,
        from: env.TELNYX_NUMBER!,
        sessionId: s.sessionId,
        leg: "B",
        commandId: commandIdB,
      });

      s.status = "b_dialing";
      publishSession(s.sessionId, s);
    }
    return res.status(200).send("ok");
  }

  // 4) B answered → bridge A <-> B
  if (evt.type === "answered" && evt.leg === "B") {
    const isRightCall = !!s.b.callControlId && evt.callControlId === s.b.callControlId;
    const numberMatches = evt.to === s.toPhone;

    s.b.status = "answered";
    log(sessionId, "B answered", {
      isRightCall,
      numberMatches,
      aCallControlId: s.a.callControlId,
      bCallControlId: s.b.callControlId,
    });
    publishSession(s.sessionId, s);

    if (isRightCall && numberMatches && s.a.callControlId && s.b.callControlId) {
      log(sessionId, "Bridging A <-> B", { a: s.a.callControlId, b: s.b.callControlId });
      await provider.bridge({ aCallControlId: s.a.callControlId, bCallControlId: s.b.callControlId });
      s.a.status = "bridged";
      s.b.status = "bridged";
      s.status = "bridged";
      publishSession(s.sessionId, s);
      log(sessionId, "Bridge complete");
    }
    return res.status(200).send("ok");
  }

  // 5) call.bridged (confirmation that they are bridged)
 if (evt.type === "bridged") {
    if (evt.leg === "A") s.a.status = "bridged";
    if (evt.leg === "B") s.b.status = "bridged";
    s.status = "bridged";
    publishSession(s.sessionId, s);
    log(sessionId, "Bridged (webhook confirm)");
    return res.status(200).send("ok");
  }

  // 6) Hangup
  if (evt.type === "hangup") {
    const cause = (evt.raw as any)?.data?.payload?.hangup_cause;
    log(sessionId, "Hangup", { cause });
    s.status = "ended";
    s.a.status = s.a.status === "bridged" ? "ended" : s.a.status;
    s.b.status = s.b.status === "bridged" ? "ended" : s.b.status;
    publishSession(s.sessionId, s);
    return res.status(200).send("ok");
  }

  // 7) Unhandled -> log + ack
  log(sessionId, `Unhandled event: ${evt.type}`);
  return res.status(200).send("ok");
}
