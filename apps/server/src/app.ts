import express from "express";
import cors from "cors";
import { env } from "./config";
import callsRouter from "./routes/calls.routes";
import { telnyxWebhook } from "./webhooks/telnyx.webhook";

export function createApp() {
  const app = express();

  // CORS + JSON por defecto
  app.use(cors());
  app.use(express.json());

  // Webhook Telnyx: necesita raw body para verificar firma
  app.post(
    `/webhooks/${env.WEBHOOK_SECRET_PATH}`,
    express.raw({ type: "*/*" }),
    // guardamos raw body en req.rawBody
    (req: any, _res, next) => {
      req.rawBody = Buffer.from(req.body);
      next();
    },
    // parseamos JSON para tener req.body usable
    (req: any, _res, next) => {
      try {
        req.body = JSON.parse(req.rawBody.toString("utf8"));
      } catch {}
      next();
    },
    telnyxWebhook
  );

  // Rutas API
  app.use("/api/calls", callsRouter);

  // Healthcheck
  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}
