import express from "express";
import cors from "cors";
import pino from "pino";
import { env } from "./config";

const app = express();
const log = pino({ name: "server" });

app.use(cors());
app.use(express.json());

// health
app.get("/health", (_req, res) => res.json({ ok: true }));

// placeholder: endpoints reales llegarán en T2+
app.get("/api/info", (_req, res) => {
  res.json({ name: "telnyx-call-bridge", version: "0.1.0" });
});

app.listen(env.PORT, () => {
  log.info(`API up on http://localhost:${env.PORT}`);
});
