import { Router } from "express";
import { env } from "@config";
import { getProvider } from "providers/factory";

const router = Router();

router.post("/token", async (_req, res) => {
  try {
    if (process.env.CALL_PROVIDER !== "telnyx") {
      return res
        .status(400)
        .json({ error: "WebRTC token only supported for Telnyx in T6." });
    }
    const prov = getProvider();
    if (!("createWebRTCToken" in prov)) {
      return res
        .status(500)
        .json({ error: "Provider does not implement createWebRTCToken." });
    }
    if (!env.TELNYX_WEBRTC_CREDENTIAL_ID) {
      return res
        .status(500)
        .json({ error: "Missing TELNYX_WEBRTC_CREDENTIAL_ID" });
    }
    console.log(env.TELNYX_WEBRTC_CREDENTIAL_ID);
    const { token } = await prov.createWebRTCToken({
      credentialId: env.TELNYX_WEBRTC_CREDENTIAL_ID,
    });
    return res.status(201).json({ token });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "token error" });
  }
});

export default router;
