import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  WEBHOOK_SECRET_PATH: z.string().default("telnyx"),
  CALL_PROVIDER: z.string().default("telnyx"),

  // Telnyx
  TELNYX_API_KEY: z.string().optional(),
  TELNYX_PUBLIC_KEY: z.string().optional(),
  TELNYX_CONNECTION_ID: z.string().optional(),
  TELNYX_NUMBER: z.string().optional(), // E.164
  TELNYX_WEBRTC_CREDENTIAL_ID: z.string().optional(),

  // Infobip
  INFOBIP_BASE_URL: z.string().optional(),
  INFOBIP_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
