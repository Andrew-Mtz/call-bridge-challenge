import express from "express";
import cors from "cors";
import { env } from "@config";
import apiRouter from "@routes/index.routes";
import { telnyxWebhook } from "@webhooks/telnyx.webhook";

export function createApp() {
  const app = express();

  // CORS
  app.use(cors());

  // --- Webhook BEFORE express.json() ---
  app.post(
    `/webhooks/${env.WEBHOOK_SECRET_PATH}`,
    // 1) keep raw bytes for signature verification
    express.raw({ type: "*/*" }),
    (req: any, res, next) => {
      // ensure it's really a Buffer
      if (!Buffer.isBuffer(req.body)) {
        return res.status(415).send("raw body required");
      }
      const raw = req.body as Buffer;

      // 2) expose raw for the verifier
      req.rawBody = raw;

      // 3) best-effort JSON parse to have req.body usable
      try {
        req.body = JSON.parse(raw.toString("utf8"));
      } catch {
        req.body = {};
      }
      next();
    },
    telnyxWebhook
  );

  // --- JSON parser for the rest of the API ---
  app.use(express.json());

  // API routes
  app.use("/api", apiRouter);

  // Healthcheck
  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}
