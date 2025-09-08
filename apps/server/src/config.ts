import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),

  // Telnyx (se usarán en T2+)
  TELNYX_API_KEY: z.string().optional(),
  TELNYX_PUBLIC_KEY: z.string().optional(),
  TELNYX_CONNECTION_ID: z.string().optional(),
  TELNYX_NUMBER: z.string().optional(), // E.164, p.e. +13125550123
  WEBHOOK_SECRET_PATH: z.string().default("telnyx"), // para URL tipo /webhooks/telnyx
});

export const env = EnvSchema.parse(process.env);
