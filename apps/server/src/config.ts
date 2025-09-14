import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),

  TELNYX_API_KEY: z.string().optional(),
  TELNYX_PUBLIC_KEY: z.string().optional(),
  TELNYX_CONNECTION_ID: z.string().optional(),
  TELNYX_NUMBER: z.string().optional(), // E.164
  WEBHOOK_SECRET_PATH: z.string().default("telnyx"),
  TELNYX_WEBRTC_CREDENTIAL_ID: z.string().optional(),

  CALL_PROVIDER: z.string().default("telnyx"),
});

export const env = EnvSchema.parse(process.env);
