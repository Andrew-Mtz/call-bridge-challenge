import { Router } from "express";
import { env } from "@config";
import { getProviderByName } from "providers/factory";

const router = Router();

router.post("/token", async (req, res) => {
  try {
    const provider =
      (req.query.provider as string) || (req.body?.provider as string);
    if (!provider)
      return res
        .status(400)
        .json({ error: "provider is required (telnyx|infobip)" });

    const prov = getProviderByName(provider);

    if (prov.name === "telnyx") {
      if (!env.TELNYX_WEBRTC_CREDENTIAL_ID) {
        return res
          .status(500)
          .json({ error: "Missing TELNYX_WEBRTC_CREDENTIAL_ID" });
      }
      const { token } = await prov.createWebRTCToken({
        credentialId: env.TELNYX_WEBRTC_CREDENTIAL_ID,
      });
      return res.status(201).json({ token });
    }

    if (prov.name === "infobip") {
      const identity = (req.body?.identity as string) || `user-${Date.now()}`;
      const displayName = req.body?.displayName as string | undefined;
      const { token } = await prov.createWebRTCToken({ identity, displayName });
      return res.status(201).json({ token });
    }

    return res
      .status(400)
      .json({ error: `Provider ${prov.name} does not support WebRTC token` });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "token error" });
  }
});

export default router;
