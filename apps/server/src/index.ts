import pino from "pino";
import { env } from "./config";
import { createApp } from "./app";

const log = pino({ name: "server" });
const app = createApp();

app.listen(env.PORT, () => {
  log.info(`API up on http://localhost:${env.PORT}`);
  log.info(`Webhook: POST /webhooks/${env.WEBHOOK_SECRET_PATH}`);
});
